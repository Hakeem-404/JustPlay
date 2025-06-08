import { supabase } from './supabase'
import { Profile, ProfileFormData } from '../types/profile'

export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }

    return data
  },

  async createProfile(userId: string, email: string, profileData: ProfileFormData): Promise<{ error: any }> {
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email,
        name: profileData.name,
        location: profileData.location,
        bio: profileData.bio || null,
        skill_level: profileData.skill_level,
        preferred_sports: profileData.preferred_sports,
        profile_completed: true
      })

    return { error }
  },

  async updateProfile(userId: string, profileData: Partial<ProfileFormData>): Promise<{ error: any }> {
    const updateData: any = {
      ...profileData,
      updated_at: new Date().toISOString()
    }

    // If we're updating core profile fields, mark as completed
    if (profileData.name || profileData.location || profileData.skill_level || profileData.preferred_sports) {
      updateData.profile_completed = true
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)

    return { error }
  },

  async checkProfileExists(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    return !error && !!data
  }
}