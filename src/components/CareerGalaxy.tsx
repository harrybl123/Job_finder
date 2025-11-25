import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useConstellationStore } from '@/hooks/useConstellationStore';
import { getUserId } from '@/lib/userSession';
import { CAREER_GALAXY, CareerNode, applyRecommendations, clearRecommendations } from '@/data/careerGalaxyData';
import { generateRadialLayout, PositionedNode, DEFAULT_LAYOUT_CONFIG } from '@/utils/galaxyLayout';
import JobListPanel from './JobListPanel';
import Starfield from './Starfield';

interface CareerGalaxyProps {
    data?: any;
    onNodeClick?: (node: any) => void;
    paths?: Array<{
        type: string;           // "Direct Fit", "Strategic Pivot", "Aspirational"
        nodeIds: string[];      // Legacy support
        pathNodes?: Array<{     // New rich format for dynamic nodes
            id: string;
            name: string;
            level: number;
        }>;
        reasoning: string;
        optimizedSearchQuery: string;
    }>;
    recommendationReason?: string; // Why this path is recommended
}

// Path type colors
const PATH_COLORS: Record<string, string> = {
    'Direct Fit': '#10b981',      // Green
    'Strategic Pivot': '#f59e0b',  // Orange/Amber
    'Aspirational': '#8b5cf6'      // Purple
};

export default function CareerGalaxy({ data, onNodeClick, paths, recommendationReason }: CareerGalaxyProps) {
    const { selectRole } = useConstellationStore();
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    // Use ref for high-performance imperative updates (pan/zoom)
    const viewBoxRef = useRef({ x: -750, y: -450, width: 1500, height: 900 });
    // Use state ONLY for smooth transitions (auto-zoom, centering)
    const [viewBoxState, setViewBoxState] = useState<{ x: number, y: number, width: number, height: number } | null>(null);

    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    // Job count state
    const [jobCounts, setJobCounts] = useState<Record<string, { count: number, jobs?: any[], loading: boolean, reasoning?: string, keyStrengths?: string[], potentialGaps?: string[] }>>({});
    const [loadingJobCount, setLoadingJobCount] = useState<string | null>(null);
    const [selectedJobNodeId, setSelectedJobNodeId] = useState<string | null>(null);

    // Helper to update SVG viewBox imperatively
    const updateViewBox = useCallback((vb: { x: number, y: number, width: number, height: number }) => {
        viewBoxRef.current = vb;
        if (containerRef.current) {
            const svg = containerRef.current.querySelector('svg');
            if (svg) {
                svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
            }
        }
    }, []);

    // Sync state changes to ref (for smooth transitions)
    useEffect(() => {
        if (viewBoxState) {
            updateViewBox(viewBoxState);
        }
    }, [viewBoxState, updateViewBox]);

    // DEBUG: Log paths whenever they change
    useEffect(() => {
        console.log('🎯 CareerGalaxy Props Check:');
        console.log('  paths:', paths);
        console.log('  paths length:', paths?.length);
        console.log('  recommendationReason:', recommendationReason);
    }, [paths, recommendationReason]);

    // Smooth zoom easing system
    const currentZoomRef = useRef(1);
    const targetZoomRef = useRef(1);
    const animationFrameRef = useRef<number | null>(null);

    // State for progressive disclosure - Initialize with root nodes immediately
    const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
    const [visibleNodeIds, setVisibleNodeIds] = useState<Set<string>>(() => {
        console.log('🎬 INITIALIZING visibleNodeIds with root nodes:', CAREER_GALAXY.rootNodes);
        return new Set(CAREER_GALAXY.rootNodes);
    });
    const [expansionHistory, setExpansionHistory] = useState<string[]>([]); // Track expansion order for "back"


    // Note: Recommendations are now applied directly in the useMemo for allPositionedNodes
    // No separate useEffect needed since we track paths in the dependency array

    // Build radial web layout with all nodes positioned - ALWAYS use static CAREER_GALAXY
    const allPositionedNodes = useMemo(() => {
        console.log('📊 Building galaxy from static CAREER_GALAXY tree');

        // Create a local copy of nodes to allow dynamic injection
        // We use a deep copy for the nodes we modify to avoid mutating the static data
        const nodesMap: Record<string, CareerNode> = {};
        Object.keys(CAREER_GALAXY.nodes).forEach(key => {
            nodesMap[key] = { ...CAREER_GALAXY.nodes[key], childIds: [...CAREER_GALAXY.nodes[key].childIds] };
        });

        // Dynamically inject missing nodes from paths
        if (paths && paths.length > 0) {
            paths.forEach(path => {
                if (path.pathNodes && path.pathNodes.length > 0) {
                    path.pathNodes.forEach((nodeInfo, index) => {
                        // If node doesn't exist in our map, create it
                        if (!nodesMap[nodeInfo.id]) {
                            console.log(`✨ Injecting dynamic node: ${nodeInfo.name} (${nodeInfo.id})`);

                            // Infer parent from previous node in path
                            const parentId = index > 0 ? path.pathNodes![index - 1].id : null;

                            // Create new node
                            nodesMap[nodeInfo.id] = {
                                id: nodeInfo.id,
                                name: nodeInfo.name,
                                level: nodeInfo.level as any,
                                parentId: parentId,
                                childIds: [], // Will be populated later
                                color: parentId && nodesMap[parentId] ? nodesMap[parentId].color : '#6b7280', // Inherit color
                                description: 'AI-generated career node',
                                recommended: true
                            };

                            // Connect to parent
                            if (parentId && nodesMap[parentId]) {
                                if (!nodesMap[parentId].childIds.includes(nodeInfo.id)) {
                                    nodesMap[parentId].childIds.push(nodeInfo.id);
                                }
                            }
                        }
                    });
                }
            });
        }

        console.log('Total nodes (after injection):', Object.keys(nodesMap).length);
        console.log('Root nodes:', CAREER_GALAXY.rootNodes);

        const allNodes = Object.values(nodesMap) as CareerNode[];

        // Use the extracted layout utility
        const positionedNodes = generateRadialLayout(allNodes, DEFAULT_LAYOUT_CONFIG);

        // Apply path recommendations to positioned nodes
        if (paths && paths.length > 0) {
            // First, collect all node IDs that should be marked as recommended
            const recommendedNodeIds = new Set<string>();

            paths.forEach(path => {
                // Extract node IDs from either pathNodes or nodeIds
                const pathNodeIds = path.pathNodes
                    ? path.pathNodes.map((pn: any) => pn.id)
                    : (path.nodeIds || []);

                pathNodeIds.forEach((nodeId: string) => {
                    recommendedNodeIds.add(nodeId);

                    // BACKFILL: Add all ancestors of this node to recommended set
                    let currentNode = positionedNodes.find(n => n.id === nodeId);
                    while (currentNode && currentNode.parentId) {
                        recommendedNodeIds.add(currentNode.parentId);
                        currentNode = positionedNodes.find(n => n.id === currentNode!.parentId);
                    }
                });
            });

            console.log('🎨 Marking nodes as recommended:', Array.from(recommendedNodeIds));

            // Now apply recommended styling to all nodes in the set
            positionedNodes.forEach(node => {
                if (recommendedNodeIds.has(node.id)) {
                    const nodePaths = paths.filter(p =>
                        p.nodeIds?.includes(node.id) ||
                        p.pathNodes?.some((pn: any) => pn.id === node.id)
                    );

                    // Even if this is a backfilled ancestor, mark it as recommended
                    node.recommended = true;
                    node.pathTypes = nodePaths.length > 0
                        ? nodePaths.map(p => p.type)
                        : ['Direct Fit']; // Default for backfilled ancestors
                    node.pathColors = nodePaths.length > 0
                        ? nodePaths.map(p => PATH_COLORS[p.type] || '#10b981')
                        : ['#10b981']; // Green for Direct Fit

                    // Add reasoning only for the final node in each path
                    const primaryPath = nodePaths[0] || paths[0];
                    const lastNodeId = primaryPath.nodeIds
                        ? primaryPath.nodeIds[primaryPath.nodeIds.length - 1]
                        : primaryPath.pathNodes?.[primaryPath.pathNodes.length - 1]?.id;

                    if (node.id === lastNodeId) {
                        node.recommendationReason = primaryPath.reasoning;
                    }
                }
            });
        }

        return { allNodes: positionedNodes, allLinks: [] }; // Links will be calculated separately
    }, [paths]);

    // Calculate links separately based on positioned nodes
    const links = useMemo(() => {
        const allLinks: { from: string; to: string; fromPos: { x: number, y: number }, toPos: { x: number, y: number }, color: string }[] = [];
        const { allNodes } = allPositionedNodes;

        allNodes.forEach(node => {
            if (node.parentId) {
                const parent = allNodes.find(n => n.id === node.parentId);
                if (parent) {
                    allLinks.push({
                        from: parent.id,
                        to: node.id,
                        fromPos: { x: parent.x, y: parent.y },
                        toPos: { x: node.x, y: node.y },
                        color: node.color
                    });
                }
            }
        });
        return allLinks;
    }, [allPositionedNodes]);

    // Filter visible nodes and links based on progressive disclosure
    const { visibleNodes, visibleLinks } = useMemo(() => {
        const { allNodes } = allPositionedNodes;

        console.log('🔍 VISIBILITY FILTER:');
        console.log('  Total nodes:', allNodes.length);
        console.log('  visibleNodeIds size:', visibleNodeIds.size);
        console.log('  visibleNodeIds:', Array.from(visibleNodeIds));

        // Filter nodes: must be in visibleNodeIds set
        const filteredNodes = allNodes.filter(n => visibleNodeIds.has(n.id));

        console.log('  Filtered visible nodes:', filteredNodes.length);
        console.log('  Visible node names:', filteredNodes.map(n => n.name));

        // Filter links: both source and target must be visible
        const filteredLinks = links.filter(l =>
            visibleNodeIds.has(l.from) && visibleNodeIds.has(l.to)
        );

        console.log('  Visible links:', filteredLinks.length);

        return { visibleNodes: filteredNodes, visibleLinks: filteredLinks };
    }, [allPositionedNodes, links, visibleNodeIds]);

    // Auto-expand and zoom to the primary path when it loads
    // DISABLED: Let users manually explore the path instead of auto-expanding
    /*
    useEffect(() => {
        console.log('🔍 Auto-expand useEffect triggered');
        console.log({
            hasPaths: !!paths,
            pathsLength: paths?.length,
            hasNodes: allPositionedNodes.allNodes.length > 0,
            nodeCount: allPositionedNodes.allNodes.length
        });

        // Extract the primary path (Direct Fit) from the paths array
        const primaryPath = paths?.find(p => p.type === 'Direct Fit') || paths?.[0];
        
        if (!primaryPath || allPositionedNodes.allNodes.length === 0) {
            console.log('❌ No primary path or no nodes, skipping auto-expand');
            return;
        }

        // Support both pathNodes (new format) and nodeIds (legacy)
        let primaryNodeIds: string[] = [];
        
        if (primaryPath.pathNodes && primaryPath.pathNodes.length > 0) {
            // NEW FORMAT: Extract IDs from pathNodes
            primaryNodeIds = primaryPath.pathNodes.map((pn: any) => pn.id);
            console.log('✅ Using pathNodes format:', primaryNodeIds);
        } else if (primaryPath.nodeIds && primaryPath.nodeIds.length > 0) {
            // LEGACY FORMAT: Use nodeIds directly
            primaryNodeIds = primaryPath.nodeIds;
            console.log('✅ Using legacy nodeIds format:', primaryNodeIds);
        } else {
            console.log('❌ No nodeIds or pathNodes in primary path');
            return;
        }

        if (primaryNodeIds.length > 1) {
            console.log('✅ AUTO-EXPANDING PRIMARY PATH:', primaryNodeIds);

            // BACKFILL PARENT NODES: Ensure path includes ALL ancestors up to super-cluster (level 0)
            const completePathIds: string[] = [...primaryNodeIds];
            const firstNodeId = primaryNodeIds[0];
            const firstNode = allPositionedNodes.allNodes.find(n => n.id === firstNodeId);
            
            if (firstNode && firstNode.level !== 0) {
                console.log('⚠️ Path does not start from super-cluster, backfilling parents...');
                const ancestors: string[] = [];
                let currentNode = firstNode;
                
                // Walk up the tree to find all ancestors
                while (currentNode && currentNode.parentId) {
                    ancestors.unshift(currentNode.parentId); // Add to front
                    currentNode = allPositionedNodes.allNodes.find(n => n.id === currentNode!.parentId) || null;
                }
                
                // Prepend ancestors to create complete path
                completePathIds.unshift(...ancestors);
                console.log('✨ Complete path with ancestors:', completePathIds);
            }

            // Make ALL nodes in the complete path visible immediately
            setVisibleNodeIds(prev => {
                const newSet = new Set(prev);
                completePathIds.forEach(id => newSet.add(id));
                console.log(`✨ Added ${completePathIds.length} path nodes to visible set`);
                return newSet;
            });

            // Expand each parent node in sequence (except the last leaf node)
            const nodesToExpand = completePathIds.slice(0, -1);
            console.log('📂 Nodes to expand:', nodesToExpand);

            nodesToExpand.forEach((nodeId, index) => {
                setTimeout(() => {
                    const node = allPositionedNodes.allNodes.find(n => n.id === nodeId);
                    console.log(`📂 Expanding node ${index}:`, { nodeId, found: !!node, hasChildren: node?.childIds?.length });

                    if (node) {
                        // Mark this node as expanded
                        setExpandedNodeIds(prev => new Set([...prev, nodeId]));
                        
                        // Add immediate children to visible set (for progressive disclosure UI)
                        if (node.childIds && node.childIds.length > 0) {
                            setVisibleNodeIds(prev => {
                                const newSet = new Set(prev);
                                node.childIds.forEach((childId: string) => newSet.add(childId));
                                return newSet;
                            });
                        }
                    }
                }, index * 300); // Stagger for animation
            });

            // Center and zoom on the final job node after expansion completes
            const finalNodeId = primaryNodeIds[primaryNodeIds.length - 1];
            setTimeout(() => {
                const finalNode = allPositionedNodes.allNodes.find(n => n.id === finalNodeId);
                if (finalNode) {
                    console.log('🎯 Zooming to final node:', finalNodeId);
                    // Zoom to 2.7x on recommended path
                    const baseWidth = 2000;
                    const baseHeight = 1200;
                    const zoom = 2.7;
                    const newWidth = baseWidth / zoom;
                    const newHeight = baseHeight / zoom;

                    // Use state for smooth transition on auto-zoom
                    setViewBoxState({
                        x: finalNode.x - newWidth / 2,
                        y: finalNode.y - newHeight / 2,
                        width: newWidth,
                        height: newHeight
                    });
                    console.log(`Auto-zoomed to ${zoom}x on ${finalNode.name}`);
                }
            }, nodesToExpand.length * 300 + 500);
        }
    }, [paths, allPositionedNodes]);
    */

    // Handle node clicks
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // Only left click
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
        setViewBoxState(null); // Disable transitions during interaction
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning) return;

        const currentVB = viewBoxRef.current;
        const container = containerRef.current;
        if (!container) return;

        // Calculate scale based on current viewBox and container size
        const scaleX = currentVB.width / container.clientWidth;
        const scaleY = currentVB.height / container.clientHeight;

        const dx = (e.clientX - panStart.x) * scaleX;
        const dy = (e.clientY - panStart.y) * scaleY;

        updateViewBox({
            ...currentVB,
            x: currentVB.x - dx,
            y: currentVB.y - dy
        });

        setPanStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    // Zoom handler - Direct updates for reliability
    const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        e.stopPropagation();

        const sensitivity = 0.002;
        const delta = -e.deltaY * sensitivity;

        // Calculate the new zoom value
        const newZoom = targetZoomRef.current * (1 + delta);

        // Clamp between limits
        const minZoom = 0.3;
        const maxZoom = 4;

        // Update target zoom
        const finalZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
        targetZoomRef.current = finalZoom;
        currentZoomRef.current = finalZoom;

        // Apply zoom immediately
        const currentVB = viewBoxRef.current;
        updateViewBox({
            ...currentVB,
            width: 2000 / finalZoom,
            height: 1200 / finalZoom
        });
    }, [updateViewBox]);

    // Center on a node with proper zoom
    const centerOnNode = useCallback((node: PositionedNode, zoomLevel?: number) => {
        // Base viewBox dimensions (what user sees at 1x zoom)
        const baseWidth = 2000;
        const baseHeight = 1200;

        // Determine zoom level based on node level if not specified
        let actualZoom = zoomLevel;
        if (!actualZoom) {
            const zoomLevels = {
                0: 0.9,  // Super-clusters - wide view to see all branches
                1: 1.2,  // Industries - moderate zoom to see siblings + children
                2: 1.5,  // Sub-industries - closer but still contextual
                3: 1.8,  // Role families - focus on branch
                4: 2.2   // Job titles - close for details
            };
            actualZoom = zoomLevels[node.level as keyof typeof zoomLevels] || 1.5;
        }

        // Calculate new viewBox - smaller dimensions = more zoom
        const newWidth = baseWidth / actualZoom;
        const newHeight = baseHeight / actualZoom;

        // Sync refs so scroll zooming starts from here
        targetZoomRef.current = actualZoom;
        currentZoomRef.current = actualZoom;

        // Use state for smooth transition
        setViewBoxState({
            x: node.x - newWidth / 2,
            y: node.y - newHeight / 2,
            width: newWidth,
            height: newHeight
        });
    }, []);

    // Handle node click - reveal children or trigger job search
    const handleNodeClickInternal = async (node: PositionedNode) => {
        // If it's a job title, trigger search AND fetch intelligent job count
        if (node.level === 4) {
            selectRole(node.id);
            if (onNodeClick) onNodeClick({ type: 'role', ...node });

            // Open the panel immediately
            setSelectedJobNodeId(node.id);

            // Fetch job count with AI analysis if not already loaded or loading
            if (!jobCounts[node.id] && loadingJobCount !== node.id) {
                setLoadingJobCount(node.id);

                try {
                    const userId = getUserId();

                    if (!userId) {
                        // Fall back to generic search
                        const response = await fetch('/api/job-count', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                jobTitle: node.name,
                                location: 'United Kingdom'
                            })
                        });

                        if (response.ok) {
                            const data = await response.json();
                            setJobCounts(prev => ({
                                ...prev,
                                [node.id]: {
                                    count: data.count,
                                    jobs: data.jobs || [],
                                    loading: false
                                }
                            }));
                        }
                    } else {
                        // AI-powered search
                        const analysisResponse = await fetch('/api/analyze-fit', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId,
                                jobTitle: node.name
                            })
                        });

                        if (!analysisResponse.ok) throw new Error('Failed to analyze fit');

                        const analysis = await analysisResponse.json();

                        const jobResponse = await fetch('/api/job-count', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                intelligentQuery: analysis.intelligentQuery,
                                location: 'United Kingdom'
                            })
                        });

                        if (jobResponse.ok) {
                            const data = await jobResponse.json();
                            setJobCounts(prev => ({
                                ...prev,
                                [node.id]: {
                                    count: data.count,
                                    jobs: data.jobs || [],
                                    loading: false,
                                    reasoning: analysis.reasoning,
                                    keyStrengths: analysis.keyStrengths,
                                    potentialGaps: analysis.potentialGaps
                                }
                            }));
                        }
                    }
                } catch (error) {
                    console.error('Error in intelligent job search:', error);
                } finally {
                    setLoadingJobCount(null);
                }
            }
            return;
        }
        // Toggle expansion logic
        const isExpanded = expandedNodeIds.has(node.id);
        const childIds = node.childIds;

        if (isExpanded) {
            // COLLAPSE
            const nodesToRemove = new Set<string>();
            const findDescendants = (nodeId: string) => {
                const n = allPositionedNodes.allNodes.find(x => x.id === nodeId);
                if (n) {
                    nodesToRemove.add(nodeId);
                    n.childIds.forEach((childId: string) => findDescendants(childId));
                }
            };
            childIds.forEach((id: string) => findDescendants(id));

            setVisibleNodeIds(prev => {
                const newSet = new Set(prev);
                nodesToRemove.forEach(id => newSet.delete(id));
                return newSet;
            });

            setExpandedNodeIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(node.id);
                return newSet;
            });
        } else if (childIds.length > 0) {
            // EXPAND
            const siblings = allPositionedNodes.allNodes.filter(n =>
                n.parentId === node.parentId && n.id !== node.id
            );

            const nodesToRemove = new Set<string>();
            const removeDescendants = (nodeId: string) => {
                const nodeToRemove = allPositionedNodes.allNodes.find(n => n.id === nodeId);
                if (nodeToRemove) {
                    nodesToRemove.add(nodeId);
                    nodeToRemove.childIds.forEach((childId: string) => removeDescendants(childId));
                }
            };

            siblings.forEach(sibling => {
                if (expandedNodeIds.has(sibling.id)) {
                    sibling.childIds.forEach((childId: string) => removeDescendants(childId));
                }
            });

            setVisibleNodeIds(prev => {
                const newSet = new Set(prev);
                nodesToRemove.forEach(id => newSet.delete(id));
                childIds.forEach((id: string) => newSet.add(id));
                return newSet;
            });

            setExpandedNodeIds(prev => {
                const newSet = new Set(prev);
                siblings.forEach(s => newSet.delete(s.id));
                newSet.add(node.id);
                return newSet;
            });

            // Add to history
            setExpansionHistory(prev => [...prev, node.id]);

            // Center view on the clicked node
            centerOnNode(node);
        }
    };

    // Reset view
    // Zoom function
    const zoom = (direction: 'in' | 'out') => {
        const factor = direction === 'in' ? 1.3 : 1 / 1.3;
        const newZoom = direction === 'in'
            ? Math.min(4, targetZoomRef.current * factor)
            : Math.max(0.3, targetZoomRef.current * factor);

        targetZoomRef.current = newZoom;
        currentZoomRef.current = newZoom;

        const currentVB = viewBoxRef.current;
        updateViewBox({
            ...currentVB,
            width: 2000 / newZoom,
            height: 1200 / newZoom
        });
    };

    const resetView = () => {
        setViewBoxState({ x: -1000, y: -600, width: 2000, height: 1200 });
    };

    // Back - collapse the most recently expanded node
    const handleBack = () => {
        if (expansionHistory.length === 0) return;

        const lastExpandedId = expansionHistory[expansionHistory.length - 1];
        const lastNode = allPositionedNodes.allNodes.find(n => n.id === lastExpandedId);

        if (lastNode) {
            // Collapse the last expanded node
            const nodesToRemove = new Set<string>();

            const findDescendants = (nodeId: string) => {
                const n = allPositionedNodes.allNodes.find((x: any) => x.id === nodeId);
                if (n) {
                    nodesToRemove.add(nodeId);
                    n.childIds.forEach((childId: string) => findDescendants(childId));
                }
            };

            lastNode.childIds.forEach((id: string) => findDescendants(id));

            setVisibleNodeIds(prev => {
                const newSet = new Set(prev);
                nodesToRemove.forEach(id => newSet.delete(id));
                return newSet;
            });

            setExpandedNodeIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(lastExpandedId);
                return newSet;
            });

            // Remove from history
            setExpansionHistory(prev => prev.slice(0, -1));

            // Center on the parent node
            if (lastNode.parentId) {
                const parent = allPositionedNodes.allNodes.find(n => n.id === lastNode.parentId);
                if (parent) centerOnNode(parent);
            }
        }
    };

    // Collapse all - reset to initial state
    const handleCollapseAll = () => {
        const rootNodes = CAREER_GALAXY.rootNodes;
        setVisibleNodeIds(new Set(rootNodes));
        setExpandedNodeIds(new Set());
        // Reset to default view
        setViewBoxState({ x: -1000, y: -600, width: 2000, height: 1200 });
    };

    // Handle saving a job
    const handleSaveJob = async (job: any) => {
        const userId = getUserId();
        if (!userId) {
            alert('Please upload your CV first to save jobs.');
            return;
        }

        try {
            const response = await fetch('/api/save-job', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    jobData: job,
                    status: 'saved'
                })
            });

            if (!response.ok) throw new Error('Failed to save job');

            // Optional: Show success toast or update UI
            console.log('Job saved successfully');
        } catch (error) {
            console.error('Error saving job:', error);
            alert('Failed to save job. Please try again.');
        }
    };

    // Set initial viewBox
    useEffect(() => {
        if (containerRef.current) {
            const svg = containerRef.current.querySelector('svg');
            if (svg) {
                const vb = viewBoxRef.current;
                svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
            }
        }
    }, []);

    {/* No synthetic onWheel – native listener handles preventDefault & zoom */ }
    return (
        <div
            ref={containerRef}
            className="w-full h-full relative bg-slate-900/50 rounded-3xl overflow-hidden"
            onWheel={handleWheel}
        >
            {/* Dynamic Starfield Background */}
            <Starfield />
            <style>{`
                @keyframes emp-wave {
          0% {
            transform: scale(1);
            opacity: 0.9;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }
        @keyframes pulse-stroke {
                    0%, 100% {
                        stroke-width: 4;
                        stroke-opacity: 1;
                    }
                    50% {
                        stroke-width: 8;
                        stroke-opacity: 0.7;
                    }
                }
                .pulse-link {
                    animation: pulse-opacity 2s ease-in-out infinite;
                }
                @keyframes pulse-opacity {
                    0%, 100% { opacity: 0.8; }
                    50% { opacity: 1; }
                }
            `}</style>
            {/* Controls */}
            <div className="flex items-center justify-between p-4 bg-slate-800/50 border-b border-white/10 relative z-20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={resetView}
                        className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors text-sm flex items-center gap-2"
                    >
                        🏠 Reset View
                    </button>
                    <button
                        onClick={handleBack}
                        disabled={expansionHistory.length === 0}
                        className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg transition-colors text-sm flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        ⬅️ Back
                    </button>
                </div>
                <div className="text-xs text-white/50">
                    Drag to pan • Scroll to zoom • Click to reveal
                </div>
            </div>

            {/* SVG Canvas */}
            <svg
                ref={svgRef}
                className="w-full h-full cursor-move relative z-10"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                    transition: viewBoxState ? 'viewBox 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none',
                    userSelect: 'none',
                    touchAction: 'none'
                }}
            >
                <defs>
                    {/* Standard glow for hover */}
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Pulse glow for recommended nodes */}
                    <filter id="pulse-glow">
                        <feGaussianBlur stdDeviation="8" result="coloredBlur" />
                        <feFlood floodColor="#60a5fa" floodOpacity="0.8" result="flood" />
                        <feComposite in="flood" in2="coloredBlur" operator="in" result="comp" />
                        <feMerge>
                            <feMergeNode in="comp" />
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Add CSS animation */}
                <style>
                    {`
                        @keyframes pulse {
                            0%, 100% { opacity: 1; transform: scale(1); }
                            50% { opacity: 0.7; transform: scale(1.05); }
                        }
                        .pulse-node {
                            animation: pulse 2s ease-in-out infinite;
                        }
                        @keyframes flow {
                            0% { stroke-dashoffset: 20; }
                            100% { stroke-dashoffset: 0; }
                        }
                        .flow-line {
                            animation: flow 1.5s linear infinite;
                        }
                    `}
                </style>

                {/* Gradient definitions for premium path effects */}
                <defs>
                    <linearGradient id="path-gradient-green" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                        <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
                    </linearGradient>
                    <linearGradient id="path-gradient-orange" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                        <stop offset="50%" stopColor="#f59e0b" stopOpacity="1" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.4" />
                    </linearGradient>
                    <linearGradient id="path-gradient-purple" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                        <stop offset="50%" stopColor="#8b5cf6" stopOpacity="1" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4" />
                    </linearGradient>
                    <filter id="link-glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Links */}
                <g className="links">
                    {visibleLinks.map((link, idx) => {
                        // Check if this link is part of any recommended path
                        const allPathNodeIds = paths?.flatMap(p => p.nodeIds || p.pathNodes?.map(pn => pn.id) || []) || [];
                        const fromIndex = allPathNodeIds.indexOf(link.from);
                        const toIndex = allPathNodeIds.indexOf(link.to);
                        const isRecommendedLink = fromIndex !== -1 && toIndex !== -1 && toIndex === fromIndex + 1;

                        // Determine which path type this link belongs to
                        let pathType = null;
                        if (isRecommendedLink && paths) {
                            for (const path of paths) {
                                const pathIds = path.nodeIds || path.pathNodes?.map(pn => pn.id) || [];
                                const fromIdx = pathIds.indexOf(link.from);
                                const toIdx = pathIds.indexOf(link.to);
                                if (fromIdx !== -1 && toIdx !== -1 && toIdx === fromIdx + 1) {
                                    pathType = path.type;
                                    break;
                                }
                            }
                        }

                        // Get gradient color based on path type
                        const gradientId = pathType === 'Direct Fit' ? 'path-gradient-green' :
                            pathType === 'Strategic Pivot' ? 'path-gradient-orange' :
                                pathType === 'Aspirational' ? 'path-gradient-purple' : null;

                        return (
                            <g key={idx}>
                                {/* Base link */}
                                <line
                                    x1={link.fromPos.x}
                                    y1={link.fromPos.y}
                                    x2={link.toPos.x}
                                    y2={link.toPos.y}
                                    stroke={isRecommendedLink && gradientId ? `url(#${gradientId})` : link.color}
                                    strokeWidth={isRecommendedLink ? 4 : 2}
                                    strokeOpacity={isRecommendedLink ? 0.9 : 0.4}
                                    filter={isRecommendedLink ? 'url(#link-glow)' : undefined}
                                    className="transition-all duration-300"
                                />

                                {/* Animated flow overlay for recommended links */}
                                {isRecommendedLink && (
                                    <line
                                        x1={link.fromPos.x}
                                        y1={link.fromPos.y}
                                        x2={link.toPos.x}
                                        y2={link.toPos.y}
                                        stroke={gradientId ? `url(#${gradientId})` : link.color}
                                        strokeWidth="3"
                                        strokeOpacity="0.6"
                                        strokeDasharray="10 10"
                                        className="flow-line"
                                    />
                                )}

                                {/* Particle flow for recommended links */}
                                {isRecommendedLink && [0, 0.33, 0.66].map((delay, particleIdx) => {
                                    const pathId = `path-${idx}`;
                                    const particleColor = pathType === 'Direct Fit' ? '#10b981' :
                                        pathType === 'Strategic Pivot' ? '#f59e0b' :
                                            pathType === 'Aspirational' ? '#8b5cf6' : '#60a5fa';

                                    return (
                                        <g key={`particle-${particleIdx}`}>
                                            <path
                                                id={`${pathId}-${particleIdx}`}
                                                d={`M ${link.fromPos.x} ${link.fromPos.y} L ${link.toPos.x} ${link.toPos.y}`}
                                                fill="none"
                                                stroke="none"
                                            />
                                            <circle r="4" fill={particleColor} opacity="0.9">
                                                <animateMotion
                                                    dur="3s"
                                                    repeatCount="indefinite"
                                                    begin={`${delay * 3}s`}
                                                >
                                                    <mpath href={`#${pathId}-${particleIdx}`} />
                                                </animateMotion>
                                                <animate
                                                    attributeName="opacity"
                                                    values="0;0.9;0.9;0"
                                                    dur="3s"
                                                    repeatCount="indefinite"
                                                    begin={`${delay * 3}s`}
                                                />
                                            </circle>
                                        </g>
                                    );
                                })}
                            </g>
                        );
                    })}
                </g>

                {/* Nodes */}
                <g className="nodes">
                    {visibleNodes.map((node) => {
                        // Dramatically increased base sizes for better readability
                        const baseSize = node.level === 0 ? 95 : node.level === 1 ? 72 : node.level === 2 ? 56 : node.level === 3 ? 45 : 35;
                        const isHovered = hoveredNode === node.id;
                        const isRecommended = node.recommended === true;
                        const isJobNode = node.level === 4; // Job title nodes

                        // Make recommended nodes larger
                        const size = isRecommended ? baseSize * 1.4 : baseSize;

                        // Dim non-recommended nodes
                        const opacity = isRecommended || isHovered ? 1 : 0.3;

                        return (
                            <g
                                key={node.id}
                                transform={`translate(${node.x}, ${node.y})`}
                                onClick={() => handleNodeClickInternal(node)}
                                onMouseEnter={() => setHoveredNode(node.id)}
                                onMouseLeave={() => setHoveredNode(null)}
                                className="cursor-pointer transition-all duration-200"
                                style={{
                                    filter: isHovered && isJobNode
                                        ? 'brightness(1.3)'
                                        : isHovered
                                            ? 'url(#glow)'
                                            : isRecommended
                                                ? 'url(#pulse-glow)'
                                                : 'none',
                                    opacity
                                }}
                            >
                                {/* Premium pulsing halos - Multi-path support */}
                                {isRecommended && node.pathColors && node.pathColors.length > 0 && (
                                    <>
                                        {/* Render pulse rings for each path this node belongs to */}
                                        {node.pathColors.map((color, pathIndex) => (
                                            <React.Fragment key={pathIndex}>
                                                {/* Inner glow base */}
                                                <circle
                                                    r={size * 1.3}
                                                    fill="none"
                                                    stroke={color}
                                                    strokeWidth="4"
                                                    opacity="0.3"
                                                    filter="url(#link-glow)"
                                                />

                                                {/* First pulse wave - large and dramatic */}
                                                <circle
                                                    r={size}
                                                    fill="none"
                                                    stroke={color}
                                                    strokeWidth="4"
                                                    style={{
                                                        transformOrigin: '0 0',
                                                        animation: 'emp-wave 3s ease-out infinite',
                                                        animationDelay: `${pathIndex * 0.6}s`
                                                    }}
                                                />
                                                {/* Second pulse wave - offset timing */}
                                                <circle
                                                    r={size}
                                                    fill="none"
                                                    stroke={color}
                                                    strokeWidth="3"
                                                    style={{
                                                        transformOrigin: '0 0',
                                                        animation: 'emp-wave 3s ease-out infinite',
                                                        animationDelay: `${pathIndex * 0.6 + 1.0}s`
                                                    }}
                                                />
                                                {/* Third pulse wave - creates depth */}
                                                <circle
                                                    r={size}
                                                    fill="none"
                                                    stroke={color}
                                                    strokeWidth="2"
                                                    style={{
                                                        transformOrigin: '0 0',
                                                        animation: 'emp-wave 3s ease-out infinite',
                                                        animationDelay: `${pathIndex * 0.6 + 2.0}s`
                                                    }}
                                                />
                                            </React.Fragment>
                                        ))}
                                    </>
                                )}

                                {/* Glassmorphic Circle Node */}
                                <circle
                                    r={size}
                                    fill={node.color}
                                    fillOpacity={isRecommended ? "0.75" : "0.6"}
                                    stroke={node.color}
                                    strokeWidth={isRecommended ? 3 : 2}
                                    strokeOpacity={1.0}
                                    className="transition-all duration-200"
                                    style={{
                                        filter: isHovered
                                            ? 'brightness(1.4) drop-shadow(0 0 30px currentColor)'
                                            : isRecommended
                                                ? `brightness(1.2) drop-shadow(0 0 20px ${node.color})`
                                                : 'brightness(1.0)',
                                        backdropFilter: 'blur(10px)'
                                    }}
                                />

                                {/* Text INSIDE the tile - centered */}
                                <text
                                    y={0}
                                    dominantBaseline="middle"
                                    textAnchor="middle"
                                    fill="#ffffff"
                                    fontSize={node.level === 0 ? 22 : node.level === 1 ? 18 : node.level === 2 ? 16 : node.level === 3 ? 14 : 12}
                                    fontWeight={node.level === 0 ? 'bold' : node.level === 1 ? '700' : '600'}
                                    className="pointer-events-none select-none"
                                    style={{
                                        textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,0.7)',
                                        letterSpacing: '0.3px'
                                    }}
                                >
                                    {/* Multi-line text for longer names */}
                                    {node.name.length > 20 ? (
                                        <>
                                            <tspan x="0" dy="-0.6em">{node.name.substring(0, node.name.indexOf(' ', 10) || 15)}</tspan>
                                            <tspan x="0" dy="1.2em">{node.name.substring((node.name.indexOf(' ', 10) || 15) + 1, 30)}...</tspan>
                                        </>
                                    ) : (
                                        node.name
                                    )}
                                </text>

                                {/* Recommendation star indicator - top right */}
                                {isRecommended && (
                                    <text
                                        x={size - 15}
                                        y={-size + 15}
                                        fontSize={20}
                                        className="pointer-events-none"
                                    >
                                        ✨
                                    </text>
                                )}

                                {/* Full name tooltip on hover */}
                                {isHovered && node.name.length > 18 && (
                                    <text
                                        y={size + 50}
                                        textAnchor="middle"
                                        fill="#ffffff"
                                        fontSize={16}
                                        fontWeight="bold"
                                        className="pointer-events-none"
                                        style={{
                                            textShadow: '0 0 8px rgba(0,0,0,1)'
                                        }}
                                    >
                                        {node.name}
                                    </text>
                                )}



                                {/* Job node hint */}
                                {isHovered && isJobNode && (
                                    <text
                                        y={-size - 15}
                                        textAnchor="middle"
                                        fill="#10b981"
                                        fontSize={11}
                                        fontWeight="bold"
                                        className="pointer-events-none"
                                    >
                                        🎯 Click for jobs!
                                    </text>
                                )}




                                {/* Info icon for nodes with details - CLEAN ALTERNATIVE */}
                                {node.reasoning && (
                                    <text
                                        x={size - 15}
                                        y={size - 15}
                                        fontSize={18}
                                        className="pointer-events-none"
                                        style={{
                                            filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.8))'
                                        }}
                                    >
                                        ℹ️
                                    </text>
                                )}


                                {/* Expansion/Collapse hint */}
                                {isHovered && node.level < 4 && (
                                    expandedNodeIds.has(node.id) ? (
                                        <text
                                            y={size + 35}
                                            textAnchor="middle"
                                            fill="#f59e0b"
                                            fontSize={9}
                                            className="pointer-events-none"
                                        >
                                            Click to collapse
                                        </text>
                                    ) : node.childIds.length > 0 ? (
                                        <text
                                            y={size + 35}
                                            textAnchor="middle"
                                            fill="#60a5fa"
                                            fontSize={9}
                                            className="pointer-events-none"
                                        >
                                            Click to explore ({node.childIds.length} options)
                                        </text>
                                    ) : null
                                )}

                                {/* Job search hint for level 4 */}
                                {isHovered && node.level === 4 && (
                                    <text
                                        y={size + 35}
                                        textAnchor="middle"
                                        fill="#10b981"
                                        fontSize={9}
                                        className="pointer-events-none"
                                    >
                                        Click to search jobs
                                    </text>
                                )}

                                {/* Job count badge for Level 4 nodes */}
                                {node.level === 4 && jobCounts[node.id] && (
                                    <g>
                                        {/* Badge background */}
                                        <rect
                                            x={-30}
                                            y={size + 10}
                                            width={60}
                                            height={20}
                                            rx={10}
                                            fill="#10b981"
                                            opacity="0.9"
                                            className="animate-pulse"
                                        />
                                        {/* Job count text */}
                                        <text
                                            y={size + 24}
                                            textAnchor="middle"
                                            fill="#ffffff"
                                            fontSize={11}
                                            fontWeight="600"
                                            className="pointer-events-none"
                                        >
                                            🔍 {jobCounts[node.id].count} jobs
                                        </text>
                                    </g>
                                )}

                                {/* Loading spinner for job count */}
                                {node.level === 4 && loadingJobCount === node.id && (
                                    <text
                                        y={size + 24}
                                        textAnchor="middle"
                                        fill="#60a5fa"
                                        fontSize={11}
                                        className="pointer-events-none animate-pulse"
                                    >
                                        Loading...
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </g>
            </svg >

            {/* Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
                {/* Zoom In */}
                <button
                    onClick={() => zoom('in')}
                    className="w-10 h-10 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 rounded-lg flex items-center justify-center text-white text-xl font-bold transition-all hover:scale-110"
                    title="Zoom In"
                >
                    +
                </button>

                {/* Zoom Out */}
                <button
                    onClick={() => zoom('out')}
                    className="w-10 h-10 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 rounded-lg flex items-center justify-center text-white text-xl font-bold transition-all hover:scale-110"
                    title="Zoom Out"
                >
                    −
                </button>

                {/* Reset View */}
                <button
                    onClick={resetView}
                    className="w-10 h-10 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 rounded-lg flex items-center justify-center text-white text-sm transition-all hover:scale-110"
                    title="Reset View"
                >
                    ⟲
                </button>

                {/* Start Over */}
                <button
                    onClick={async () => {
                        if (!confirm('Start over? This will clear your chat history and recommendations.')) return;

                        try {
                            const userId = localStorage.getItem('userId');
                            if (userId) {
                                await fetch('/api/chat-history', {
                                    method: 'DELETE',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId })
                                });
                            }
                            localStorage.removeItem('userId');
                            window.location.reload();
                        } catch (error) {
                            console.error('Error clearing data:', error);
                            alert('Failed to clear data. Try refreshing the page.');
                        }
                    }}
                    className="w-10 h-10 bg-orange-600/80 hover:bg-orange-500/90 backdrop-blur-md border border-white/20 rounded-lg flex items-center justify-center text-white text-lg transition-all hover:scale-110"
                    title="Start Over"
                >
                    🔄
                </button>
            </div>

            {/* Legends */}
            < div className="absolute bottom-4 right-4 space-y-3" >
                {/* Path Legend - Only show if we have paths */}
                {
                    paths && paths.length > 0 && (
                        <div className="bg-black/70 backdrop-blur-md p-4 rounded-xl border border-white/10 text-xs">
                            <div className="text-white/80 font-bold mb-3 uppercase tracking-wide">Career Paths</div>
                            <div className="space-y-2.5">
                                {paths.map((path, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <div
                                            className="w-3 h-3 rounded-full shrink-0"
                                            style={{ backgroundColor: PATH_COLORS[path.type] || '#6b7280' }}
                                        />
                                        <span className="text-white/80 font-medium">{path.type}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                }

                {/* Levels Legend */}
                <div className="bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 text-xs">
                    <div className="text-white/50 font-bold mb-2">LEVELS</div>
                    <div className="space-y-1 text-white/70">
                        <div>🌌 Super-Clusters</div>
                        <div>🏢 Industries</div>
                        <div>📊 Sub-Industries</div>
                        <div>👤 Role Families</div>
                        <div>💼 Job Titles</div>
                    </div>
                </div>
            </div >
            {/* Job List Panel */}
            <JobListPanel
                isOpen={!!selectedJobNodeId}
                onClose={() => setSelectedJobNodeId(null)}
                jobTitle={selectedJobNodeId ? allPositionedNodes.allNodes.find(n => n.id === selectedJobNodeId)?.name || 'Job Listings' : ''}
                jobs={selectedJobNodeId && jobCounts[selectedJobNodeId] ? (jobCounts[selectedJobNodeId].jobs || []) : []}
                count={selectedJobNodeId && jobCounts[selectedJobNodeId] ? jobCounts[selectedJobNodeId].count : 0}
                loading={selectedJobNodeId === loadingJobCount}
                reasoning={selectedJobNodeId && jobCounts[selectedJobNodeId] ? jobCounts[selectedJobNodeId].reasoning : undefined}
                keyStrengths={selectedJobNodeId && jobCounts[selectedJobNodeId] ? jobCounts[selectedJobNodeId].keyStrengths : undefined}
                potentialGaps={selectedJobNodeId && jobCounts[selectedJobNodeId] ? jobCounts[selectedJobNodeId].potentialGaps : undefined}
                onSaveJob={handleSaveJob}
            />
        </div >
    );
}
