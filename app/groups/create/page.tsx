'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateGroup() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          password: password || null, // Send null if no password
          createdBy: 'demo-user' // TODO: Replace with real user ID from auth
        })
      })

      const result = await response.json()

      if (result.success) {
        console.log('Group created:', result.data)
        router.push('/groups')
      } else {
        setError(result.error || 'Failed to create group')
      }
    } catch (err) {
      console.error('Error creating group:', err)
      setError('Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Group</h1>
        <p className="text-gray-600 mt-2">
          Create a group to compete with friends on NFL picks
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="mb-6">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Group Name *
          </label>
          <input
            type="text"
            id="name"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-nfl-blue focus:border-nfl-blue"
            placeholder="e.g., Family Picks, Work League"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-nfl-blue focus:border-nfl-blue"
            placeholder="Tell your group members what this is about..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password (Optional)
          </label>
          <input
            type="password"
            id="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-nfl-blue focus:border-nfl-blue"
            placeholder="Leave blank for public group"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-sm text-gray-500 mt-1">
            If you set a password, only people with the password can join your group
          </p>
        </div>

        {error && (
          <div className="mb-6 text-red-600 text-sm">{error}</div>
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
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </form>

      <div className="mt-8 card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">How it works</h3>
        <ul className="space-y-2 text-gray-600">
          <li className="flex items-start">
            <span className="text-nfl-blue mr-2">•</span>
            You'll be the group administrator and can invite members
          </li>
          <li className="flex items-start">
            <span className="text-nfl-blue mr-2">•</span>
            Each week, members pick every NFL game
          </li>
          <li className="flex items-start">
            <span className="text-nfl-blue mr-2">•</span>
            Picks are locked until 1pm on Sunday
          </li>
          <li className="flex items-start">
            <span className="text-nfl-blue mr-2">•</span>
            Weekly winners are determined by most correct picks
          </li>
        </ul>
      </div>
    </div>
  )
}
