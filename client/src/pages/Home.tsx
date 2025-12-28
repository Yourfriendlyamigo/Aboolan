import { useFamilyMembers } from "@/hooks/use-family";
import { FamilyMemberResponse } from "@shared/routes";
import { MemberCard } from "@/components/MemberCard";
import { MemberDialog } from "@/components/MemberDialog";
import { CreateRootDialog } from "@/components/CreateRootDialog";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { hierarchy, tree } from "d3-hierarchy";
import { useState, useMemo, useRef, useEffect } from "react";
import { Loader2, Trees } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";

// Helper to build hierarchy for D3
interface TreeNode extends FamilyMemberResponse {
  children?: TreeNode[];
}

function buildTreeData(members: FamilyMemberResponse[]): TreeNode[] {
  const dataMap = new Map<number, TreeNode>();
  
  // First pass: create all nodes
  members.forEach(m => {
    dataMap.set(m.id, { ...m, children: [] });
  });
  
  const roots: TreeNode[] = [];
  const compareByPosition = (a: TreeNode, b: TreeNode) => {
    const posA = a.position ?? 0;
    const posB = b.position ?? 0;
    if (posA !== posB) return posA - posB;
    return a.name.localeCompare(b.name);
  };
  
  // Second pass: link children to parents
  members.forEach(m => {
    const node = dataMap.get(m.id)!;
    if (m.parentId && dataMap.has(m.parentId)) {
      dataMap.get(m.parentId)!.children!.push(node);
    } else {
      roots.push(node); // It's a root
    }
  });

  dataMap.forEach((node) => {
    if (node.children && node.children.length > 1) {
      node.children.sort(compareByPosition);
    }
  });

  if (roots.length > 1) {
    roots.sort(compareByPosition);
  }
  
  return roots;
}

export default function Home() {
  const { data: members, isLoading, error } = useFamilyMembers();
  const [selectedMember, setSelectedMember] = useState<FamilyMemberResponse | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [lastCollapsedId, setLastCollapsedId] = useState<number | null>(null);
  const transformRef = useRef<ReactZoomPanPinchContentRef | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("familyTreeExpanded");
      if (!raw) return;
      const ids = JSON.parse(raw) as number[];
      if (Array.isArray(ids)) {
        setExpandedNodes(new Set(ids));
      }
    } catch {
      // Ignore persisted state if it can't be parsed.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("familyTreeExpanded", JSON.stringify([...expandedNodes]));
    } catch {
      // Ignore write failures (e.g., privacy mode).
    }
  }, [expandedNodes]);
  
  const handleDrop = async (targetId: number) => {
    if (draggedId && draggedId !== targetId) {
      try {
        const response = await fetch("/api/family/swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id1: draggedId, id2: targetId }),
        });
        if (!response.ok) {
          throw new Error("Swap failed");
        }
      } catch (error) {
        console.error("Swap failed:", error);
      }
    }
    setDraggedId(null);
    setDragOverId(null);
  };


  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  // Track which nodes have children in the original tree
  const nodeHasChildrenMap = useMemo(() => {
    const map = new Map<number, boolean>();
    if (!members) return map;
    
    members.forEach(m => {
      const hasChildren = members.some(other => other.parentId === m.id);
      map.set(m.id, hasChildren);
    });
    
    return map;
  }, [members]);


  const treeLayout = useMemo(() => {
    if (!members || members.length === 0) return null;

    const rootNodes = buildTreeData(members);
    if (rootNodes.length === 0) return null;

    // Filter tree: only show expanded branches
    function filterTree(node: TreeNode): TreeNode | null {
      if (node.id === -1) {
        // Virtual root - always show
        return {
          ...node,
          children: node.children?.map(child => filterTree(child)).filter((c): c is TreeNode => c !== null) || []
        };
      }
      
      const isExpanded = expandedNodes.has(node.id);
      return {
        ...node,
        children: isExpanded 
          ? (node.children?.map(child => filterTree(child)).filter((c): c is TreeNode => c !== null) || [])
          : []
      };
    }

    // Create a virtual root to hold all actual roots if there are multiple family trees
    const virtualRoot = {
      id: -1,
      name: "Virtual Root",
      parentId: null,
      motherName: null,
      phoneNumber: null,
      isDeceased: false,
      position: 0,
      children: rootNodes
    };

    const filteredRoot = filterTree(virtualRoot) as TreeNode;
    const d3Hierarchy = hierarchy(filteredRoot);
    
    // Calculate layout size based on number of visible leaves
    const leafCount = d3Hierarchy.leaves().length;
    const width = Math.max(window.innerWidth, leafCount * 220);
    const height = Math.max(window.innerHeight - 100, d3Hierarchy.height * 250);

    const d3Tree = tree<TreeNode>().size([width, height]);
    const root = d3Tree(d3Hierarchy);

    // Filter out the virtual root for rendering
    const nodes = root.descendants().filter(d => d.data.id !== -1);
    const links = root.links().filter(l => l.source.data.id !== -1);

    return { nodes, links, width, height };
  }, [members, expandedNodes]);

  useEffect(() => {
    if (!treeLayout || lastCollapsedId === null) return;
    const targetNode = treeLayout.nodes.find((node) => node.data.id === lastCollapsedId);
    const ref = transformRef.current;
    if (!targetNode || !ref?.instance?.wrapperComponent) return;

    const wrapper = ref.instance.wrapperComponent;
    const { width, height } = wrapper.getBoundingClientRect();
    const scale = ref.instance.transformState.scale;
    const positionX = width / 2 - targetNode.x * scale;
    const positionY = height / 2 - targetNode.y * scale;

    ref.setTransform(positionX, positionY, scale, 450, "easeOut");
    setLastCollapsedId(null);
  }, [treeLayout, lastCollapsedId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-display text-lg">Tracing ancestry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-4">
        <div className="bg-destructive/10 p-6 rounded-2xl max-w-md">
          <h2 className="text-2xl font-bold text-destructive mb-2">Could not load family tree</h2>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  const isEmpty = !members || members.length === 0;

  return (
    <div className="h-screen w-screen overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-background flex flex-col">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center sm:justify-between gap-4 sm:gap-0 pointer-events-none relative">
        <div className="pointer-events-auto bg-white/80 backdrop-blur-md px-6 py-3 rounded-full shadow-sm border border-border/50">
          <h1 className="text-3xl sm:text-2xl font-display font-bold text-primary flex items-center gap-2">
            <Trees className="w-6 h-6" />
            Aboolan Family Tree
          </h1>
        </div>

        <div className="pointer-events-auto hidden sm:block bg-white/80 backdrop-blur-md px-5 py-2 rounded-full shadow-sm border border-border/50 text-sm font-semibold text-foreground sm:absolute sm:left-1/2 sm:-translate-x-1/2">
          {members?.length ?? 0} member{(members?.length ?? 0) === 1 ? "" : "s"}
        </div>

        <div className="pointer-events-auto w-full sm:w-auto">
          <div className="grid grid-cols-2 gap-3 sm:block">
            <div className="bg-white/80 backdrop-blur-md px-5 py-2 rounded-full shadow-sm border border-border/50 text-sm font-semibold text-foreground text-center sm:hidden">
              {members?.length ?? 0} member{(members?.length ?? 0) === 1 ? "" : "s"}
            </div>
            <div className="flex justify-center sm:justify-end">
              <CreateRootDialog />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative">
        {isEmpty ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <div className="bg-white p-12 rounded-3xl shadow-xl border border-border max-w-lg">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trees className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-3xl font-display font-bold text-foreground mb-4">Start Your Tree</h2>
              <p className="text-muted-foreground mb-8 text-lg">
                Your family tree is empty. Begin by adding the oldest ancestor (grandparent) to start branching out.
              </p>
              <CreateRootDialog />
            </div>
          </div>
        ) : (
          <TransformWrapper
            initialScale={0.8}
            minScale={0.1}
            maxScale={2}
            centerOnInit
            limitToBounds={false}
          >
            {(transformApi) => {
              transformRef.current = transformApi;
              return (
            <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
              <div 
                style={{ 
                  width: treeLayout?.width ?? '100%', 
                  height: treeLayout?.height ?? '100%',
                  position: 'relative',
                  minWidth: '100vw',
                  minHeight: '100vh',
                }}
                className="flex items-center justify-center pt-24 pb-24"
              >
                {/* SVG Layer for connecting lines */}
                <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible">
                  {treeLayout?.links.map((link, i) => {
                    const pathD = `
                      M${link.source.x},${link.source.y + 40}
                      C${link.source.x},${(link.source.y + link.target.y) / 2}
                       ${link.target.x},${(link.source.y + link.target.y) / 2}
                       ${link.target.x},${link.target.y - 60}
                    `;
                    return (
                      <motion.path
                        key={i}
                        d={pathD}
                        className="tree-line"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        exit={{ pathLength: 0, opacity: 0 }}
                        transition={{ duration: 1.1, ease: "easeInOut" }}
                      />
                    );
                  })}
                </svg>

                {/* Nodes Layer */}
                {treeLayout?.nodes.map((node) => {
                  const hasChildren = nodeHasChildrenMap.get(node.data.id) || false;
                  const isExpanded = expandedNodes.has(node.data.id);
                  
                  return (
                    <motion.div
                      key={node.data.id}
                      className="absolute"
                      style={{
                        left: node.x,
                        top: node.y,
                      }}
                      initial={{ opacity: 0, y: -20, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.8 }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                      layout
                    >
                      <div style={{ transform: 'translate(-50%, -50%)' }}>
                        <MemberCard
                          member={node.data}
                          level={node.depth - 1}
                          onClick={() => setSelectedMember(node.data)}
                          hasChildren={hasChildren}
                          isExpanded={isExpanded}
                          onToggleExpand={() => {
                            const newExpanded = new Set(expandedNodes);
                            if (isExpanded) {
                              newExpanded.delete(node.data.id);
                              setLastCollapsedId(node.data.id);
                            } else {
                              newExpanded.add(node.data.id);
                              setLastCollapsedId(null);
                            }
                            setExpandedNodes(newExpanded);
                          }}
                          isDragging={draggedId === node.data.id}
                          onDragStart={(id) => setDraggedId(id)}
                          onDragEnter={(id) => setDragOverId(id)}
                          onDragEnd={handleDragEnd}
                          dragOverId={dragOverId}
                        />
                        {dragOverId === node.data.id && draggedId && draggedId !== node.data.id && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 border-2 border-primary rounded-2xl pointer-events-none"
                          />
                        )}
                        {draggedId !== null && (
                          <div
                            onDrop={() => handleDrop(node.data.id)}
                            onDragLeave={() => setDragOverId(null)}
                            onDragOver={(e) => e.preventDefault()}
                            className="absolute inset-0 pointer-events-auto"
                          />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </TransformComponent>
              );
            }}
          </TransformWrapper>
        )}
      </main>

      {/* Dialogs */}
      <MemberDialog 
        member={selectedMember} 
        isOpen={!!selectedMember} 
        onClose={() => setSelectedMember(null)} 
        allMembers={members || []}
      />
    </div>
  );
}
