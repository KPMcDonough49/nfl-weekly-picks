'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PlusIcon, UserGroupIcon, MagnifyingGlassIcon, LockClosedIcon } from '@heroicons/react/24/outline'

interface Group {
  id: string
  name: string
  description?: string
  password?: string | null
  memberCount: number
  currentWeek: number
  isMember: boolean
}

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch('/api/groups')
        const result = await response.json()
        
        if (result.success) {
          const groupsWithMembership = result.data.map((group: any) => ({
            id: group.id,
            name: group.name,
            description: group.description,
            password: group.password,
            memberCount: group._count.members,
            currentWeek: 1, // TODO: Get actual current week
            isMember: true // TODO: Check actual membership
          }))
          
          setGroups(groupsWithMembership)
        } else {
          console.error('Failed to fetch groups:', result.error)
        }
      } catch (error) {
        console.error('Error fetching groups:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGroups()
  }, [])

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="h-10 bg-gray-300 rounded mb-6"></div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
        <Link href="/groups/create" className="btn-primary flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Group
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-nfl-blue focus:border-nfl-blue"
          placeholder="Search groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Groups Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.map((group) => (
          <div key={group.id} className="card">
            <div className="flex items-center mb-4">
              <UserGroupIcon className="h-8 w-8 text-nfl-blue mr-3" />
              <div className="flex-1">
                <div className="flex items-center">
                  <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                  {group.password && (
                    <LockClosedIcon className="h-4 w-4 text-orange-500 ml-2" />
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {group.memberCount} members • Week {group.currentWeek}
                  {group.password && <span className="text-orange-600"> • Password Protected</span>}
                </p>
              </div>
            </div>
            
            {group.description && (
              <p className="text-gray-600 mb-4">{group.description}</p>
            )}

            <div className="flex justify-between items-center">
              {group.isMember ? (
                <Link
                  href={`/groups/${group.id}`}
                  className="btn-primary"
                >
                  View Group
                </Link>
              ) : (
                <Link
                  href={`/groups/${group.id}/join`}
                  className="btn-secondary"
                >
                  Join Group
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredGroups.length === 0 && (
        <div className="text-center py-12">
          <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No groups found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'Try adjusting your search terms' : 'Be the first to create a group'}
          </p>
          <Link href="/groups/create" className="btn-primary">
            Create Group
          </Link>
        </div>
      )}
    </div>
  )
}
