/**
 * Admin Network API
 * Returns graph data for visualizing profile connections
 *
 * GET /api/admin/network - Get network graph data
 * Query params:
 * - limit: Max profiles to include (default 100)
 * - minConnections: Only include profiles with at least this many connections (default 1)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { isAdmin } from '@/lib/admin';

interface Node {
  id: string;
  linkedinId: string;
  name: string;
  headline: string | null;
  avatarPath: string | null;
  company: string | null;
  connectionCount: number;
}

interface Edge {
  source: string;
  target: string;
  type: 'company' | 'introduction' | 'education';
  label: string;
}

interface NetworkData {
  nodes: Node[];
  edges: Edge[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get auth
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Cookie: request.headers.get('Cookie') || '',
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminStatus = await isAdmin(user.email || '');
    if (!adminStatus) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(200, Math.max(10, parseInt(searchParams.get('limit') || '100', 10)));
    const minConnections = Math.max(0, parseInt(searchParams.get('minConnections') || '1', 10));

    // Get profiles with their current employer
    const { data: profilesData } = await supabase
      .from('master_profiles')
      .select('*')
      .order('update_count', { ascending: false })
      .limit(limit);

    const profiles = (profilesData || []) as Array<{
      id: string;
      linkedin_id: string;
      name: string;
      headline: string | null;
      location: string | null;
      avatar_path: string | null;
    }>;

    if (profiles.length === 0) {
      return NextResponse.json({ nodes: [], edges: [] });
    }

    const profileIds = profiles.map((p) => p.id);

    // Get employers for all profiles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: employersData } = await (supabase as any)
      .from('master_profile_employers')
      .select('*')
      .in('master_profile_id', profileIds)
      .eq('is_current', true);

    const employers = (employersData || []) as Array<{
      master_profile_id: string;
      company: string;
      title: string | null;
    }>;

    // Get introduction relationships
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: introductionsData } = await (supabase as any)
      .from('user_profile_data')
      .select('master_profile_id, introduced_by_master_profile_id')
      .not('introduced_by_master_profile_id', 'is', null)
      .in('master_profile_id', profileIds);

    const introductions = (introductionsData || []) as Array<{
      master_profile_id: string;
      introduced_by_master_profile_id: string;
    }>;

    // Get education data for connections
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: educationData } = await (supabase as any)
      .from('master_profile_education')
      .select('*')
      .in('master_profile_id', profileIds);

    const education = (educationData || []) as Array<{
      master_profile_id: string;
      school: string;
    }>;

    // Build edges
    const edges: Edge[] = [];
    const connectionCounts: Record<string, number> = {};

    // Initialize connection counts
    profileIds.forEach((id) => {
      connectionCounts[id] = 0;
    });

    // Company-based edges: profiles at the same company
    const companyToProfiles: Record<string, string[]> = {};
    employers.forEach((emp) => {
      const key = emp.company.toLowerCase();
      if (!companyToProfiles[key]) {
        companyToProfiles[key] = [];
      }
      companyToProfiles[key].push(emp.master_profile_id);
    });

    Object.entries(companyToProfiles).forEach(([company, ids]) => {
      if (ids.length > 1) {
        // Create edges between all pairs at the same company
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            edges.push({
              source: ids[i],
              target: ids[j],
              type: 'company',
              label: company,
            });
            connectionCounts[ids[i]]++;
            connectionCounts[ids[j]]++;
          }
        }
      }
    });

    // Education-based edges: profiles at the same school
    const schoolToProfiles: Record<string, string[]> = {};
    education.forEach((edu) => {
      const key = edu.school.toLowerCase();
      if (!schoolToProfiles[key]) {
        schoolToProfiles[key] = [];
      }
      schoolToProfiles[key].push(edu.master_profile_id);
    });

    Object.entries(schoolToProfiles).forEach(([school, ids]) => {
      if (ids.length > 1) {
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            edges.push({
              source: ids[i],
              target: ids[j],
              type: 'education',
              label: school,
            });
            connectionCounts[ids[i]]++;
            connectionCounts[ids[j]]++;
          }
        }
      }
    });

    // Introduction-based edges
    introductions.forEach((intro) => {
      if (profileIds.includes(intro.introduced_by_master_profile_id)) {
        edges.push({
          source: intro.introduced_by_master_profile_id,
          target: intro.master_profile_id,
          type: 'introduction',
          label: 'introduced',
        });
        connectionCounts[intro.master_profile_id]++;
        connectionCounts[intro.introduced_by_master_profile_id]++;
      }
    });

    // Build employer lookup for nodes
    const profileToEmployer: Record<string, string> = {};
    employers.forEach((emp) => {
      profileToEmployer[emp.master_profile_id] = emp.company;
    });

    // Filter profiles by min connections and build nodes
    const nodes: Node[] = profiles
      .filter((p) => connectionCounts[p.id] >= minConnections)
      .map((p) => ({
        id: p.id,
        linkedinId: p.linkedin_id,
        name: p.name,
        headline: p.headline,
        avatarPath: p.avatar_path,
        company: profileToEmployer[p.id] || null,
        connectionCount: connectionCounts[p.id],
      }));

    // Filter edges to only include nodes that are in the final set
    const nodeIds = new Set(nodes.map((n) => n.id));
    const filteredEdges = edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );

    return NextResponse.json({
      nodes,
      edges: filteredEdges,
    } as NetworkData);
  } catch (error) {
    console.error('Admin network error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
