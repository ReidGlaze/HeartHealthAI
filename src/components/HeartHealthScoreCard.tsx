import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ViewStyle, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HeartHealthAnalysis } from '../api/openai';
import { healthScoreService } from '../services/HealthScoreService';

// Theme colors to match FoodAnalysisScreen
const COLORS = {
  primary: '#D32F2F',          // Primary red
  primaryLight: '#FFEBEE',     // Light red background
  primaryDark: '#B71C1C',      // Darker red for accents
  secondary: '#757575',        // Gray for secondary text
  background: '#f8f9fa',       // Light background
  white: '#FFFFFF',            // White
  black: '#202124',            // Near black for text
  error: '#D32F2F',            // Error red
  success: '#4CAF50',          // Success green 
  warning: '#FFC107',          // Warning yellow
  gray: '#5f6368',             // Gray for text
}

interface HeartHealthScoreCardProps {
  analysis: HeartHealthAnalysis;
  foodDescription?: string;
  onLogSuccess?: () => void;
  onDiscard?: () => void;
}

const HeartHealthScoreCard: React.FC<HeartHealthScoreCardProps> = ({ 
  analysis, 
  foodDescription = "Food item",
  onLogSuccess,
  onDiscard
}) => {
  const [isLogging, setIsLogging] = useState(false);
  const [isLogged, setIsLogged] = useState(false);

  // Function to get color based on score
  const getScoreColor = (score: number) => {
    if (score >= 8) return COLORS.success; // Green for good scores
    if (score >= 5) return COLORS.warning; // Yellow for medium scores
    return COLORS.error; // Red for poor scores
  };

  // Round score to 1 decimal place and ensure it displays properly
  const formattedOverallScore = analysis.overallScore.toFixed(1);

  // Handle saving the score to storage
  const handleLogScore = async () => {
    try {
      setIsLogging(true);
      await healthScoreService.logScore(foodDescription, analysis);
      setIsLogged(true);
      Alert.alert(
        "Success",
        "Heart health score saved successfully!",
        [{ text: "OK", onPress: () => onLogSuccess && onLogSuccess() }]
      );
    } catch (error) {
      console.error("Error logging score:", error);
      Alert.alert("Error", "Failed to save heart health score. Please try again.");
    } finally {
      setIsLogging(false);
    }
  };

  // Handle discarding the analysis
  const handleDiscard = () => {
    Alert.alert(
      "Discard Analysis",
      "Are you sure you want to discard this analysis?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Discard", onPress: () => onDiscard && onDiscard() }
      ]
    );
  };
  
  return (
    <View style={styles.container}>
      {/* Overall Score Section */}
      <View style={styles.scoreHeader}>
        <View style={[styles.overallScoreCircle, { borderColor: getScoreColor(analysis.overallScore) }]}>
          <Text style={[styles.overallScoreText, { color: getScoreColor(analysis.overallScore) }]}>
            {formattedOverallScore}
          </Text>
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Heart Health Score</Text>
          <Text style={styles.scoreInterpretation}>
            {analysis.overallScore >= 8 ? 'Excellent for heart health' :
             analysis.overallScore >= 6.5 ? 'Very good for heart health' :
             analysis.overallScore >= 5 ? 'Moderately good for heart health' :
             analysis.overallScore >= 3 ? 'Limited heart health benefits' :
             'Poor for heart health'}
          </Text>
        </View>
      </View>

      {/* Key Takeaway */}
      <View style={styles.takeawayContainer}>
        <Text style={styles.takeawayLabel}>Key Takeaway:</Text>
        <Text style={styles.takeawayText}>{analysis.keyTakeaway}</Text>
      </View>
      
      {/* Score Breakdown */}
      <ScoreBreakdown analysis={analysis} />

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.discardButton]} 
          onPress={handleDiscard}
          disabled={isLogging || isLogged}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.gray} />
          <Text style={styles.discardButtonText}>Discard</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.actionButton, 
            styles.logButton,
            (isLogged || isLogging) && styles.disabledButton
          ]} 
          onPress={handleLogScore}
          disabled={isLogging || isLogged}
        >
          {isLogging ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons 
                name={isLogged ? "checkmark-circle" : "save-outline"} 
                size={20} 
                color={COLORS.white} 
              />
              <Text style={styles.logButtonText}>
                {isLogged ? "Saved" : "Log Score"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Component for individual score rows
interface ScoreRowProps {
  label: string;
  score: number;
  explanation: string;
  weight: string;
}

const ScoreRow: React.FC<ScoreRowProps> = ({ label, score, explanation, weight }) => {
  // Function to get color based on score
  const getScoreColor = (score: number) => {
    if (score >= 8) return COLORS.success; // Green for good scores
    if (score >= 5) return COLORS.warning; // Yellow for medium scores
    return COLORS.error; // Red for poor scores
  };

  // Format the score to display with 1 decimal place
  const formattedScore = score.toFixed(1);

  // Calculate width for score bar (as a percentage)
  const scorePercentage = score * 10;
  const scoreBarStyle: ViewStyle = {
    width: `${scorePercentage}%`, 
    backgroundColor: getScoreColor(score),
    height: '100%',
    borderRadius: 12,
  };

  return (
    <View style={styles.scoreRow}>
      <View style={styles.scoreRowHeader}>
        <Text style={styles.scoreLabel}>{label}</Text>
        <Text style={styles.scoreWeight}>Weight: {weight}</Text>
      </View>
      
      <View style={styles.scoreBarContainer}>
        <View style={scoreBarStyle} />
        <Text style={[styles.scoreNumber, { color: getScoreColor(score) }]}>{formattedScore}</Text>
      </View>
      
      <Text style={styles.explanationText}>{explanation}</Text>
    </View>
  );
};

// Score Breakdown Section
const ScoreBreakdown: React.FC<{ analysis: HeartHealthAnalysis }> = ({ analysis }) => {
  return (
    <View style={styles.breakdownWrapper}>
      <Text style={styles.breakdownTitle}>Score Breakdown</Text>
      
      {Platform.OS === 'android' && (
        <Text style={styles.scrollHint}>Scroll for more scores</Text>
      )}
      
      <ScrollView 
        style={styles.breakdownContainer}
        contentContainerStyle={styles.breakdownContent}
        showsVerticalScrollIndicator={true}
        persistentScrollbar={true}
        nestedScrollEnabled={true}
        alwaysBounceVertical={true}
      >
        {/* Unhealthy Fat */}
        <ScoreRow 
          label="Unhealthy Fat" 
          score={analysis.scores.unhealthyFat.score} 
          explanation={analysis.scores.unhealthyFat.explanation} 
          weight="15%"
        />
        
        {/* Healthy Fat */}
        <ScoreRow 
          label="Healthy Fat" 
          score={analysis.scores.healthyFat.score} 
          explanation={analysis.scores.healthyFat.explanation} 
          weight="10%"
        />
        
        {/* Sodium */}
        <ScoreRow 
          label="Sodium" 
          score={analysis.scores.sodium.score} 
          explanation={analysis.scores.sodium.explanation} 
          weight="10%"
        />
        
        {/* Fiber */}
        <ScoreRow 
          label="Fiber" 
          score={analysis.scores.fiber.score} 
          explanation={analysis.scores.fiber.explanation} 
          weight="15%"
        />
        
        {/* Nutrient Density */}
        <ScoreRow 
          label="Nutrient Density" 
          score={analysis.scores.nutrientDensity.score} 
          explanation={analysis.scores.nutrientDensity.explanation} 
          weight="20%"
        />
        
        {/* Processing Level */}
        <ScoreRow 
          label="Processing Level" 
          score={analysis.scores.processingLevel.score} 
          explanation={analysis.scores.processingLevel.explanation} 
          weight="10%"
        />
        
        {/* Sugar */}
        <ScoreRow 
          label="Sugar" 
          score={analysis.scores.sugar.score} 
          explanation={analysis.scores.sugar.explanation} 
          weight="10%"
        />
        
        {/* Additives */}
        <ScoreRow 
          label="Additives" 
          score={analysis.scores.additives.score} 
          explanation={analysis.scores.additives.explanation} 
          weight="10%"
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: COLORS.black,
  },
  scoreInterpretation: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
  },
  overallScoreCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  overallScoreText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  outOfTen: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: -5,
  },
  takeawayContainer: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  takeawayLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  takeawayText: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: COLORS.black,
  },
  breakdownWrapper: {
    ...Platform.select({
      android: {
        height: 320,
        marginBottom: 8,
        flex: 0,
      },
      ios: {
        flex: 0,
      },
    }),
  },
  scrollHint: {
    fontSize: 12,
    color: COLORS.primary,
    textAlign: 'right',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  breakdownContainer: {
    ...Platform.select({
      ios: {
        height: 300,
        maxHeight: 300,
        flex: 1,
      },
      android: {
        height: 300,
        maxHeight: 300,
        flex: 1,
      }
    }),
  },
  breakdownContent: {
    paddingRight: Platform.OS === 'android' ? 10 : 0,
    paddingBottom: 20,
  },
  scoreRow: {
    marginBottom: 16,
  },
  scoreRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
  },
  scoreWeight: {
    fontSize: 12,
    color: COLORS.gray,
  },
  scoreBarContainer: {
    height: 24,
    backgroundColor: '#f1f3f4',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  scoreBar: {
    height: '100%',
    borderRadius: 12,
  },
  scoreNumber: {
    position: 'absolute',
    right: 12,
    fontSize: 13,
    fontWeight: 'bold',
  },
  explanationText: {
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
    paddingTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
  },
  discardButton: {
    backgroundColor: '#f1f3f4',
    marginRight: 8,
  },
  logButton: {
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  discardButtonText: {
    color: COLORS.gray,
    fontWeight: '600',
    marginLeft: 8,
  },
  logButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default HeartHealthScoreCard; 