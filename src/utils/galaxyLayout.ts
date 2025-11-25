import { CareerNode } from '@/data/careerGalaxyData';

export interface PositionedNode extends CareerNode {
    x: number;
    y: number;
    pathTypes?: string[];     // Which path types this node belongs to
    pathColors?: string[];    // Corresponding colors for each path
}

export interface RadialLayoutConfig {
    centerX: number;
    centerY: number;
    levelRadii: {
        level0: number;
        level1: number;
        level2: number;
        level3: number;
        level4: number;
    };
}

export const DEFAULT_LAYOUT_CONFIG: RadialLayoutConfig = {
    centerX: 0,
    centerY: 0,
    levelRadii: {
        level0: 400,
        level1: 900,
        level2: 1400,
        level3: 2000,
        level4: 2600
    }
};

/**
 * Generates a radial layout for the career galaxy nodes.
 * This is a pure function that takes nodes and returns positioned nodes.
 */
export function generateRadialLayout(
    allNodes: CareerNode[],
    config: RadialLayoutConfig = DEFAULT_LAYOUT_CONFIG
): PositionedNode[] {
    const { centerX, centerY, levelRadii } = config;
    const positionedNodes: PositionedNode[] = [];

    // Position level 0 (super-clusters) in a circle
    const level0Nodes = allNodes.filter(n => n.level === 0);
    level0Nodes.forEach((node, i) => {
        const angle = (i / level0Nodes.length) * Math.PI * 2 - Math.PI / 2;
        positionedNodes.push({
            ...node,
            x: centerX + Math.cos(angle) * levelRadii.level0,
            y: centerY + Math.sin(angle) * levelRadii.level0
        });
    });

    // For each super-cluster, position its children radiating outward
    positionedNodes.filter(n => n.level === 0).forEach((superCluster) => {
        const children = allNodes.filter(n => n.parentId === superCluster.id);
        const superClusterAngle = Math.atan2(superCluster.y - centerY, superCluster.x - centerX);

        // Dynamic arc span based on number of children (more children = wider arc)
        const baseArc = Math.PI / 3; // 60 degrees base
        const arcSpan = Math.min(Math.PI / 1.5, baseArc * (1 + children.length * 0.1)); // Max 120 degrees

        children.forEach((child, i) => {
            const childAngle = superClusterAngle + (i - (children.length - 1) / 2) * (arcSpan / Math.max(children.length - 1, 1));
            positionedNodes.push({
                ...child,
                x: centerX + Math.cos(childAngle) * levelRadii.level1,
                y: centerY + Math.sin(childAngle) * levelRadii.level1
            });

            // Recursively position deeper levels
            const positionChildrenRecursively = (parent: PositionedNode, currentLevel: number) => {
                const grandchildren = allNodes.filter(n => n.parentId === parent.id);
                const parentAngle = Math.atan2(parent.y - centerY, parent.x - centerX);

                const radius = currentLevel === 2 ? levelRadii.level2
                    : currentLevel === 3 ? levelRadii.level3
                        : levelRadii.level4;

                // Dynamic arc for children (wider for more nodes)
                const childArc = Math.min(Math.PI / 2, Math.PI / 3 * (1 + grandchildren.length * 0.05)); // Max 90 degrees

                grandchildren.forEach((gc, j) => {
                    const gcAngle = parentAngle + (j - (grandchildren.length - 1) / 2) * (childArc / Math.max(grandchildren.length - 1, 1));
                    const positioned = {
                        ...gc,
                        x: centerX + Math.cos(gcAngle) * radius,
                        y: centerY + Math.sin(gcAngle) * radius
                    };
                    positionedNodes.push(positioned);

                    if (currentLevel < 4) {
                        positionChildrenRecursively(positioned, currentLevel + 1);
                    }
                });
            };

            const positionedChild = positionedNodes.find(n => n.id === child.id);
            if (positionedChild && child.level < 4) {
                positionChildrenRecursively(positionedChild, child.level + 1);
            }
        });
    });

    return positionedNodes;
}
