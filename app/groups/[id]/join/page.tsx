'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ClipboardIcon, CheckIcon, LockClosedIcon } from '@heroicons/react/24/outline'

interface Group {
  id: string
  name: string
  description: string | null
  password: string | null
  createdBy: string
}

export default function JoinGroupPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string
  
  const [group, setGroup] = useState<Group | null>(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const response = await fetch(`/api/groups/${groupId}`)
        const result = await response.json()
        
        if (result.success) {
          setGroup(result.data)
        } else {
          setError('Group not found')
        }
      } catch (err) {
        console.error('Error fetching group:', err)
        setError('Failed to load group')
      } finally {
        setLoading(false)
      }
    }

    fetchGroup()
  }, [groupId])

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setJoining(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'demo-user', // TODO: Replace with real user ID from auth
          password: password || null
        })
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(`Successfully joined ${result.data.groupName}!`)
        setTimeout(() => {
          router.push(`/groups/${groupId}`)
        }, 2000)
      } else {
        setError(result.error || 'Failed to join group')
      }
    } catch (err) {
      console.error('Error joining group:', err)
      setError('Failed to join group')
    } finally {
      setJoining(false)
    }
  }

  const copyInviteLink = async () => {
    const inviteLink = `${window.location.origin}/groups/${groupId}/join`
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
          <div className="h-32 bg-gray-300 rounded"></div>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Group Not Found</h1>
          <p className="text-gray-600 mb-4">The group you're looking for doesn't exist.</p>
          <button onClick={() => router.push('/groups')} className="btn-primary">
            Back to Groups
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Join Group</h1>
        <p className="text-gray-600 mt-2">
          Join "{group.name}" to start making picks with friends
        </p>
      </div>

      <div className="card mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{group.name}</h2>
        {group.description && (
          <p className="text-gray-600 mb-4">{group.description}</p>
        )}
        
        {group.password && (
          <div className="flex items-center text-orange-600 mb-4">
            <LockClosedIcon className="h-5 w-5 mr-2" />
            <span className="text-sm">This group is password protected</span>
          </div>
        )}
      </div>

      {/* Invite Link Section */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Invite Link</h3>
        <p className="text-gray-600 text-sm mb-3">
          Share this link with friends to invite them to join this group:
        </p>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            readOnly
            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/groups/${groupId}/join`}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
          />
          <button
            onClick={copyInviteLink}
            className="px-3 py-2 bg-nfl-blue text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
          >
            {copied ? (
              <CheckIcon className="h-4 w-4" />
            ) : (
              <ClipboardIcon className="h-4 w-4" />
            )}
          </button>
        </div>
        {copied && (
          <p className="text-green-600 text-sm mt-2">Link copied to clipboard!</p>
        )}
      </div>

      {/* Join Form */}
      <form onSubmit={handleJoin} className="card">
        {group.password && (
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Group Password *
            </label>
            <input
              type="password"
              id="password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-nfl-blue focus:border-nfl-blue"
              placeholder="Enter group password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}

        {error && (
          <div className="mb-6 text-red-600 text-sm">{error}</div>
        )}

        {success && (
          <div className="mb-6 text-green-600 text-sm">{success}</div>
        )}

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={joining || Boolean(group.password && !password)}
            className="btn-primary"
          >
            {joining ? 'Joining...' : 'Join Group'}
          </button>
        </div>
      </form>
    </div>
  )
}
