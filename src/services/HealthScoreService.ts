import AsyncStorage from '@react-native-async-storage/async-storage';
import { HeartHealthAnalysis } from '../api/openai';

// Define types for logged scores
export interface LoggedScore {
  id: string;
  date: string;
  time: string;
  description: string;
  analysis: HeartHealthAnalysis;
}

export interface DailyScore {
  date: string;
  averageScore: number;
  entries: LoggedScore[];
}

export interface StreakData {
  currentStreak: number;
  lastActiveDate: string;
  bestStreak: number;
}

// Keys for storing data in AsyncStorage
const HEALTH_SCORES_KEY = 'heartHealthScores';
const STREAK_DATA_KEY = 'streakData';

// Health Score Service
class HealthScoreService {
  // Get all logged scores
  async getAllScores(): Promise<LoggedScore[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(HEALTH_SCORES_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (error) {
      console.error('Error retrieving scores:', error);
      return [];
    }
  }

  // Log a new score
  async logScore(description: string, analysis: HeartHealthAnalysis): Promise<LoggedScore> {
    try {
      const now = new Date();
      const newScore: LoggedScore = {
        id: now.getTime().toString(),
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        description,
        analysis,
      };

      const currentScores = await this.getAllScores();
      const updatedScores = [...currentScores, newScore];
      
      await AsyncStorage.setItem(HEALTH_SCORES_KEY, JSON.stringify(updatedScores));
      
      // Update streak when logging a new score
      await this.updateStreak();
      
      return newScore;
    } catch (error) {
      console.error('Error logging score:', error);
      throw new Error('Failed to log heart health score');
    }
  }

  // Get today's scores
  async getTodayScores(): Promise<LoggedScore[]> {
    try {
      const allScores = await this.getAllScores();
      const today = new Date().toISOString().split('T')[0];
      return allScores.filter(score => score.date === today);
    } catch (error) {
      console.error('Error getting today\'s scores:', error);
      return [];
    }
  }

  // Calculate today's average score
  async getTodayAverage(): Promise<number | null> {
    try {
      const todayScores = await this.getTodayScores();
      
      if (todayScores.length === 0) return null;
      
      const sum = todayScores.reduce((total, score) => total + score.analysis.overallScore, 0);
      return sum / todayScores.length;
    } catch (error) {
      console.error('Error calculating today\'s average:', error);
      return null;
    }
  }

  // Get scores grouped by day
  async getDailyScores(): Promise<DailyScore[]> {
    try {
      const allScores = await this.getAllScores();
      
      // Group scores by date
      const scoresByDate: Record<string, LoggedScore[]> = {};
      
      allScores.forEach(score => {
        if (!scoresByDate[score.date]) {
          scoresByDate[score.date] = [];
        }
        scoresByDate[score.date].push(score);
      });
      
      // Calculate daily averages
      return Object.keys(scoresByDate).map(date => {
        const entries = scoresByDate[date];
        const sum = entries.reduce((total, score) => total + score.analysis.overallScore, 0);
        const averageScore = sum / entries.length;
        
        return {
          date,
          averageScore,
          entries,
        };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date desc
    } catch (error) {
      console.error('Error getting daily scores:', error);
      return [];
    }
  }

  // Delete a score by ID
  async deleteScore(id: string): Promise<void> {
    try {
      const allScores = await this.getAllScores();
      const updatedScores = allScores.filter(score => score.id !== id);
      await AsyncStorage.setItem(HEALTH_SCORES_KEY, JSON.stringify(updatedScores));
    } catch (error) {
      console.error('Error deleting score:', error);
      throw new Error('Failed to delete heart health score');
    }
  }

  // Clear all scores (for testing)
  async clearAllScores(): Promise<void> {
    try {
      await AsyncStorage.removeItem(HEALTH_SCORES_KEY);
    } catch (error) {
      console.error('Error clearing scores:', error);
    }
  }
  
  // Get user streak data
  async getStreakData(): Promise<StreakData> {
    try {
      const jsonValue = await AsyncStorage.getItem(STREAK_DATA_KEY);
      
      if (jsonValue != null) {
        return JSON.parse(jsonValue);
      } else {
        // Default streak data if none exists
        const defaultStreak: StreakData = {
          currentStreak: 0,
          lastActiveDate: '',
          bestStreak: 0
        };
        return defaultStreak;
      }
    } catch (error) {
      console.error('Error retrieving streak data:', error);
      return {
        currentStreak: 0,
        lastActiveDate: '',
        bestStreak: 0
      };
    }
  }
  
  // Save streak data
  private async saveStreakData(streakData: StreakData): Promise<void> {
    try {
      await AsyncStorage.setItem(STREAK_DATA_KEY, JSON.stringify(streakData));
    } catch (error) {
      console.error('Error saving streak data:', error);
    }
  }
  
  // Check if user has been active today
  async hasBeenActiveToday(): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const todayScores = await this.getTodayScores();
    return todayScores.length > 0;
  }
  
  // Sync streak data with logged scores
  async syncStreak(): Promise<StreakData> {
    try {
      const allScores = await this.getAllScores();
      if (allScores.length === 0) {
        return {
          currentStreak: 0,
          lastActiveDate: '',
          bestStreak: 0
        };
      }
      
      // Sort scores by date (newest first)
      const sortedDates = [...new Set(allScores.map(score => score.date))]
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      if (sortedDates.length === 0) {
        return {
          currentStreak: 0,
          lastActiveDate: '',
          bestStreak: 0
        };
      }
      
      // Start with the most recent date
      let currentStreak = 1;
      let bestStreak = 1;
      let lastActiveDate = sortedDates[0];
      
      // Check consecutive days
      for (let i = 0; i < sortedDates.length - 1; i++) {
        const currentDate = new Date(sortedDates[i]);
        const prevDate = new Date(sortedDates[i + 1]);
        
        // Calculate day difference
        const timeDiff = currentDate.getTime() - prevDate.getTime();
        const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        
        if (dayDiff === 1) {
          // Consecutive day
          currentStreak++;
          if (currentStreak > bestStreak) {
            bestStreak = currentStreak;
          }
        } else {
          // Break in streak
          break;
        }
      }
      
      // Save and return the updated streak data
      const streakData = {
        currentStreak,
        lastActiveDate,
        bestStreak
      };
      
      await this.saveStreakData(streakData);
      return streakData;
      
    } catch (error) {
      console.error('Error syncing streak:', error);
      return {
        currentStreak: 0,
        lastActiveDate: '',
        bestStreak: 0
      };
    }
  }
  
  // Update streak when user logs food
  async updateStreak(): Promise<StreakData> {
    try {
      // First sync streak with actual logged data
      const syncedStreak = await this.syncStreak();
      const today = new Date().toISOString().split('T')[0];
      
      // If already logged today, no changes needed
      if (syncedStreak.lastActiveDate === today) {
        return syncedStreak;
      }
      
      // New day, update streak
      let streak = { ...syncedStreak };
      
      if (!streak.lastActiveDate) {
        // First time user
        streak.currentStreak = 1;
        streak.lastActiveDate = today;
        streak.bestStreak = 1;
      } else {
        const lastActive = new Date(streak.lastActiveDate);
        const todayDate = new Date(today);
        
        // Calculate difference in days
        const timeDiff = todayDate.getTime() - lastActive.getTime();
        const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        
        if (dayDiff === 1) {
          // Consecutive day, increment streak
          streak.currentStreak += 1;
          streak.lastActiveDate = today;
          
          // Update best streak if current streak is better
          if (streak.currentStreak > streak.bestStreak) {
            streak.bestStreak = streak.currentStreak;
          }
        } else if (dayDiff > 1) {
          // Streak broken (more than 1 day missed)
          streak.currentStreak = 1;
          streak.lastActiveDate = today;
        }
      }
      
      await this.saveStreakData(streak);
      return streak;
    } catch (error) {
      console.error('Error updating streak:', error);
      return {
        currentStreak: 0,
        lastActiveDate: '',
        bestStreak: 0
      };
    }
  }
}

// Export singleton instance
export const healthScoreService = new HealthScoreService(); 