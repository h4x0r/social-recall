"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Node {
  id: string;
  linkedinId: string;
  name: string;
  headline: string | null;
  avatarPath: string | null;
  company: string | null;
  connectionCount: number;
  // Computed position
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface Edge {
  source: string;
  target: string;
  type: "company" | "introduction" | "education";
  label: string;
}

interface NetworkData {
  nodes: Node[];
  edges: Edge[];
}

const EDGE_COLORS = {
  company: "#3b82f6",
  education: "#10b981",
  introduction: "#f59e0b",
};

const EDGE_LABELS = {
  company: "Same Company",
  education: "Same School",
  introduction: "Introduction",
};

export default function NetworkPage() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minConnections, setMinConnections] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  const fetchNetwork = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      params.set("minConnections", minConnections.toString());

      const response = await fetch(`/api/admin/network?${params}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch network");
      }

      const networkData = await response.json();
      setData(networkData);

      // Initialize positions in a circle
      const newPositions: Record<string, { x: number; y: number }> = {};
      const nodeCount = networkData.nodes.length;
      networkData.nodes.forEach((node: Node, i: number) => {
        const angle = (2 * Math.PI * i) / nodeCount;
        const radius = 200 + Math.random() * 50;
        newPositions[node.id] = {
          x: 400 + radius * Math.cos(angle),
          y: 300 + radius * Math.sin(angle),
        };
      });
      setPositions(newPositions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load network");
    } finally {
      setIsLoading(false);
    }
  }, [minConnections]);

  useEffect(() => {
    fetchNetwork();
  }, [fetchNetwork]);

  // Simple force simulation
  useEffect(() => {
    if (!data || data.nodes.length === 0) return;

    const nodes = data.nodes;
    const edges = data.edges;
    let localPositions = { ...positions };
    const velocities: Record<string, { vx: number; vy: number }> = {};

    nodes.forEach((n) => {
      velocities[n.id] = { vx: 0, vy: 0 };
    });

    let iteration = 0;
    const maxIterations = 150;

    const simulate = () => {
      if (iteration >= maxIterations) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        return;
      }

      const alpha = Math.max(0.01, 1 - iteration / maxIterations);

      // Apply forces
      nodes.forEach((node) => {
        if (!localPositions[node.id]) return;

        let fx = 0;
        let fy = 0;

        // Center force
        const centerX = 400;
        const centerY = 300;
        fx += (centerX - localPositions[node.id].x) * 0.01;
        fy += (centerY - localPositions[node.id].y) * 0.01;

        // Repulsion from other nodes
        nodes.forEach((other) => {
          if (node.id === other.id || !localPositions[other.id]) return;

          const dx = localPositions[node.id].x - localPositions[other.id].x;
          const dy = localPositions[node.id].y - localPositions[other.id].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 3000 / (dist * dist);

          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        });

        // Attraction from edges
        edges.forEach((edge) => {
          const otherId =
            edge.source === node.id
              ? edge.target
              : edge.target === node.id
              ? edge.source
              : null;

          if (!otherId || !localPositions[otherId]) return;

          const dx = localPositions[otherId].x - localPositions[node.id].x;
          const dy = localPositions[otherId].y - localPositions[node.id].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 100) * 0.03;

          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        });

        // Update velocity with damping
        velocities[node.id].vx = (velocities[node.id].vx + fx * alpha) * 0.7;
        velocities[node.id].vy = (velocities[node.id].vy + fy * alpha) * 0.7;
      });

      // Update positions
      const newPositions = { ...localPositions };
      nodes.forEach((node) => {
        if (!newPositions[node.id]) return;
        newPositions[node.id] = {
          x: Math.max(50, Math.min(750, newPositions[node.id].x + velocities[node.id].vx)),
          y: Math.max(50, Math.min(550, newPositions[node.id].y + velocities[node.id].vy)),
        };
      });

      localPositions = newPositions;
      setPositions(newPositions);
      iteration++;
      animationRef.current = requestAnimationFrame(simulate);
    };

    simulate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [data]);

  const getAvatarUrl = (path: string | null) => {
    if (!path) return null;
    const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
    if (!publicUrl) return null;
    return `${publicUrl}/${path}`;
  };

  // Compute which edges to highlight
  const highlightedEdges = useMemo(() => {
    const targetId = hoveredNode?.id || selectedNode?.id;
    if (!targetId || !data) return new Set<string>();

    return new Set(
      data.edges
        .filter((e) => e.source === targetId || e.target === targetId)
        .map((e) => `${e.source}-${e.target}`)
    );
  }, [hoveredNode, selectedNode, data]);

  const connectedNodes = useMemo(() => {
    const targetId = hoveredNode?.id || selectedNode?.id;
    if (!targetId || !data) return new Set<string>();

    const connected = new Set<string>([targetId]);
    data.edges.forEach((e) => {
      if (e.source === targetId) connected.add(e.target);
      if (e.target === targetId) connected.add(e.source);
    });
    return connected;
  }, [hoveredNode, selectedNode, data]);

  const viewBox = `0 0 ${800 / zoom} ${600 / zoom}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin
          </Link>
          <h1 className="text-2xl font-bold">Network Visualization</h1>
          <p className="text-muted-foreground">
            Explore connections between profiles
            {data && ` (${data.nodes.length} profiles, ${data.edges.length} connections)`}
          </p>
        </div>
        <button
          onClick={fetchNetwork}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <label className="text-sm">Min Connections:</label>
          <input
            type="range"
            min="0"
            max="5"
            value={minConnections}
            onChange={(e) => setMinConnections(parseInt(e.target.value))}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground w-4">{minConnections}</span>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="p-2 hover:bg-muted rounded"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-muted-foreground px-2">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
            className="p-2 hover:bg-muted rounded"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => setZoom(1)} className="p-2 hover:bg-muted rounded">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 border-l border-border pl-4">
          {Object.entries(EDGE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <div className="w-3 h-0.5" style={{ backgroundColor: color }} />
              <span className="text-xs text-muted-foreground">
                {EDGE_LABELS[type as keyof typeof EDGE_LABELS]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">{error}</div>
      )}

      {/* Graph Container */}
      <div className="flex gap-4">
        <div
          ref={containerRef}
          className="flex-1 bg-card rounded-lg border border-border overflow-hidden"
          style={{ height: "600px" }}
        >
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !data || data.nodes.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No network data available
            </div>
          ) : (
            <svg
              width="100%"
              height="100%"
              viewBox={viewBox}
              className="cursor-grab active:cursor-grabbing"
            >
              {/* Edges */}
              <g>
                {data.edges.map((edge) => {
                  const sourcePos = positions[edge.source];
                  const targetPos = positions[edge.target];
                  if (!sourcePos || !targetPos) return null;

                  const edgeKey = `${edge.source}-${edge.target}`;
                  const isHighlighted = highlightedEdges.has(edgeKey);
                  const isDimmed =
                    (hoveredNode || selectedNode) && !isHighlighted;

                  return (
                    <line
                      key={edgeKey}
                      x1={sourcePos.x}
                      y1={sourcePos.y}
                      x2={targetPos.x}
                      y2={targetPos.y}
                      stroke={EDGE_COLORS[edge.type]}
                      strokeWidth={isHighlighted ? 2 : 1}
                      strokeOpacity={isDimmed ? 0.1 : isHighlighted ? 1 : 0.4}
                      className="transition-all duration-200"
                    />
                  );
                })}
              </g>

              {/* Nodes */}
              <g>
                {data.nodes.map((node) => {
                  const pos = positions[node.id];
                  if (!pos) return null;

                  const isConnected = connectedNodes.has(node.id);
                  const isDimmed =
                    (hoveredNode || selectedNode) && !isConnected;
                  const isSelected = selectedNode?.id === node.id;
                  const isHovered = hoveredNode?.id === node.id;
                  const radius = 16 + node.connectionCount * 2;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      className="cursor-pointer transition-opacity duration-200"
                      style={{ opacity: isDimmed ? 0.2 : 1 }}
                      onMouseEnter={() => setHoveredNode(node)}
                      onMouseLeave={() => setHoveredNode(null)}
                      onClick={() =>
                        setSelectedNode(
                          selectedNode?.id === node.id ? null : node
                        )
                      }
                    >
                      {/* Node circle */}
                      <circle
                        r={radius}
                        fill="currentColor"
                        className={`text-background ${
                          isSelected || isHovered
                            ? "stroke-primary"
                            : "stroke-border"
                        }`}
                        strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
                      />
                      {/* Avatar or initial */}
                      <foreignObject
                        x={-radius + 2}
                        y={-radius + 2}
                        width={(radius - 2) * 2}
                        height={(radius - 2) * 2}
                      >
                        <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-muted">
                          {node.avatarPath ? (
                            <img
                              src={getAvatarUrl(node.avatarPath) || ""}
                              alt={node.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-medium">
                              {node.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </foreignObject>
                      {/* Label */}
                      <text
                        y={radius + 14}
                        textAnchor="middle"
                        className="fill-foreground text-[10px] font-medium pointer-events-none"
                      >
                        {node.name.split(" ")[0]}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          )}
        </div>

        {/* Selected Node Details */}
        {selectedNode && (
          <div className="w-80 bg-card rounded-lg border border-border p-4 space-y-4">
            <div className="flex items-start gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={getAvatarUrl(selectedNode.avatarPath) || undefined} />
                <AvatarFallback>
                  <User className="w-6 h-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{selectedNode.name}</h3>
                {selectedNode.headline && (
                  <p className="text-sm text-muted-foreground truncate">
                    {selectedNode.headline}
                  </p>
                )}
                {selectedNode.company && (
                  <p className="text-sm text-primary truncate">
                    {selectedNode.company}
                  </p>
                )}
              </div>
            </div>

            <div className="text-sm">
              <p className="text-muted-foreground">
                {selectedNode.connectionCount} connections in this view
              </p>
            </div>

            {/* Connected profiles */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Connected to:</h4>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {data?.edges
                  .filter(
                    (e) =>
                      e.source === selectedNode.id ||
                      e.target === selectedNode.id
                  )
                  .map((edge) => {
                    const otherId =
                      edge.source === selectedNode.id
                        ? edge.target
                        : edge.source;
                    const other = data.nodes.find((n) => n.id === otherId);
                    if (!other) return null;

                    return (
                      <div
                        key={`${edge.source}-${edge.target}`}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted"
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: EDGE_COLORS[edge.type] }}
                        />
                        <span className="text-sm truncate flex-1">
                          {other.name}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {edge.label}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            <Link
              href={`/admin/profiles/${selectedNode.id}`}
              className="block w-full text-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              View Profile
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
