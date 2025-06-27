"use client"

import { useState, useEffect } from 'react'

interface NodeStats {
  nodes: number
  chains: number  
  tasks: number
  activeNodes: number
}

interface HealthStatus {
  status: string
  services: {
    api: { status: string }
    redis: { status: string }
    ipfs: { status: string }
  }
  memory: {
    used: number
    total: number
  }
}

export default function Dashboard() {
  const [stats, setStats] = useState<NodeStats>({ nodes: 0, chains: 0, tasks: 0, activeNodes: 0 })
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch health and stats
    Promise.all([
      fetch('http://localhost:3001/health').then(r => r.json()),
      fetch('http://localhost:3001/api/v1/nodes').then(r => r.json())
    ]).then(([healthData, nodesData]) => {
      setHealth(healthData)
      setStats({
        nodes: nodesData.total || 0,
        chains: 0, // TODO: implement chains endpoint
        tasks: 0,  // TODO: implement tasks endpoint  
        activeNodes: nodesData.nodes?.filter((n: any) => n.status === 'active').length || 0
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">C</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  CAG-Chains
                </h1>
                <p className="text-sm text-gray-400">World's First AI Component Ecosystem</p>
              </div>
            </div>
            
            {health && (
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  health.status === 'healthy' ? 'bg-green-500' : 
                  health.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-sm text-gray-300 capitalize">{health.status}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard title="Total Nodes" value={stats.nodes} icon="🤖" />
              <StatCard title="Active Nodes" value={stats.activeNodes} icon="⚡" trend="+12%" />
              <StatCard title="Running Chains" value={stats.chains} icon="��" />
              <StatCard title="Completed Tasks" value={stats.tasks} icon="✅" trend="+8%" />
            </div>

            {/* Service Status */}
            {health && (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">System Status</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ServiceStatus 
                    name="API Server" 
                    status={health.services.api.status} 
                    icon="🚀"
                  />
                  <ServiceStatus 
                    name="Redis Cache" 
                    status={health.services.redis.status} 
                    icon="📦"
                  />
                  <ServiceStatus 
                    name="IPFS Storage" 
                    status={health.services.ipfs.status} 
                    icon="🌐"
                  />
                </div>
                
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Memory Usage: {health.memory.used}MB / {health.memory.total}MB</span>
                    <span>Uptime: Active</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <QuickAction 
                title="Create CAG Node"
                description="Deploy a new AI agent node"
                icon="🤖"
                action="/nodes/create"
              />
              <QuickAction 
                title="Build Chain"
                description="Orchestrate multi-agent workflows"
                icon="🔗"
                action="/chains/create"
              />
              <QuickAction 
                title="Browse Marketplace"
                description="Discover and trade AI components"
                icon="🏪"
                action="/marketplace"
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function StatCard({ title, value, icon, trend }: { 
  title: string
  value: number
  icon: string
  trend?: string 
}) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <div className="flex items-center space-x-2">
            <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
            {trend && (
              <span className="text-green-400 text-sm font-medium">{trend}</span>
            )}
          </div>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  )
}

function ServiceStatus({ name, status, icon }: {
  name: string
  status: string
  icon: string
}) {
  const statusColor = status === 'healthy' ? 'text-green-400' : 
                     status === 'degraded' ? 'text-yellow-400' : 'text-red-400'
  
  return (
    <div className="flex items-center space-x-3">
      <span className="text-xl">{icon}</span>
      <div>
        <p className="font-medium">{name}</p>
        <p className={`text-sm ${statusColor} capitalize`}>{status}</p>
      </div>
    </div>
  )
}

function QuickAction({ title, description, icon, action }: {
  title: string
  description: string
  icon: string
  action: string
}) {
  return (
    <button 
      onClick={() => alert(`Navigation to ${action} - Coming soon!`)}
      className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 text-left hover:bg-white/10 transition-colors group"
    >
      <div className="flex items-center space-x-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors">
          {title}
        </h3>
      </div>
      <p className="text-gray-400 text-sm">{description}</p>
    </button>
  )
}
