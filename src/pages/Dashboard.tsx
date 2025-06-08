import React from 'react'
import { Link } from 'react-router-dom'
import { Plus, MapPin, Calendar, Users, Clock, Star, Filter } from 'lucide-react'

export default function Dashboard() {
  const upcomingGames = [
    {
      id: 1,
      sport: 'Basketball',
      location: 'Central Park Courts',
      date: '2025-01-20',
      time: '6:00 PM',
      players: '8/10',
      organizer: 'Mike Johnson',
      skill: 'Intermediate',
      distance: '0.5 mi'
    },
    {
      id: 2,
      sport: 'Soccer',
      location: 'Riverside Field',
      date: '2025-01-21',
      time: '7:30 PM',
      players: '16/22',
      organizer: 'Sarah Chen',
      skill: 'Beginner',
      distance: '1.2 mi'
    },
    {
      id: 3,
      sport: 'Tennis',
      location: 'Oak Hill Tennis Club',
      date: '2025-01-22',
      time: '5:00 PM',
      players: '2/4',
      organizer: 'David Wilson',
      skill: 'Advanced',
      distance: '2.1 mi'
    }
  ]

  const myGames = [
    {
      id: 1,
      sport: 'Basketball',
      location: 'Downtown Courts',
      date: '2025-01-18',
      time: '7:00 PM',
      players: '6/8',
      status: 'confirmed'
    }
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Find and join games happening near you</p>
        </div>
        <Link
          to="/create-game"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 mt-4 sm:mt-0"
        >
          <Plus className="h-5 w-5" />
          <span>Create Game</span>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Sport</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">All Sports</option>
              <option value="basketball">Basketball</option>
              <option value="soccer">Soccer</option>
              <option value="tennis">Tennis</option>
              <option value="baseball">Baseball</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Distance</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Any Distance</option>
              <option value="1">Within 1 mile</option>
              <option value="5">Within 5 miles</option>
              <option value="10">Within 10 miles</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Skill Level</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">Any Level</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Games */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Upcoming Games</h2>
          <div className="space-y-4">
            {upcomingGames.map((game) => (
              <div key={game.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{game.sport}</h3>
                    <p className="text-gray-600 flex items-center mt-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      {game.location} • {game.distance}
                    </p>
                  </div>
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                    {game.skill}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span className="text-sm">{new Date(game.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    <span className="text-sm">{game.time}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    <span className="text-sm">{game.players} players</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Star className="h-4 w-4 mr-2" />
                    <span className="text-sm">by {game.organizer}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Need {parseInt(game.players.split('/')[1]) - parseInt(game.players.split('/')[0])} more players
                  </div>
                  <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    Join Game
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* My Games */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">My Games</h3>
            <div className="space-y-3">
              {myGames.map((game) => (
                <div key={game.id} className="border-l-4 border-green-500 bg-green-50 p-4 rounded-r-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{game.sport}</h4>
                      <p className="text-sm text-gray-600 mt-1">{game.location}</p>
                      <p className="text-sm text-gray-500">{new Date(game.date).toLocaleDateString()} at {game.time}</p>
                    </div>
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                      {game.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Games Played</span>
                <span className="font-semibold text-gray-900">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Games Organized</span>
                <span className="font-semibold text-gray-900">3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rating</span>
                <span className="font-semibold text-gray-900 flex items-center">
                  4.8 <Star className="h-4 w-4 text-yellow-400 ml-1" fill="currentColor" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}