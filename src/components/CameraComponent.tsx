import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
  Animated,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Theme colors to match the app
const COLORS = {
  primary: '#D32F2F',          // Primary red
  primaryDark: '#B71C1C',      // Darker red
  white: '#FFFFFF',            // White
  black: '#000000',            // Black
}

interface CameraComponentProps {
  onImageCaptured: (base64: string) => void;
  onClose: () => void;
}

const CameraComponent: React.FC<CameraComponentProps> = ({
  onImageCaptured,
  onClose,
}) => {
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [flashMode, setFlashMode] = useState<'on' | 'off' | 'auto'>('off');
  const [isLoading, setIsLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  // Camera shake animation when there's an error
  const shakeCamera = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  const takePicture = async () => {
    try {
      setIsLoading(true);
      if (cameraRef.current) {
        const picture = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.7,
        });
        
        if (picture && picture.base64) {
          onImageCaptured(picture.base64);
        }
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
      shakeCamera();
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      setIsLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        onImageCaptured(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlashMode = () => {
    setFlashMode(current => 
      current === 'off' ? 'on' : 
      current === 'on' ? 'auto' : 'off'
    );
  };

  const getFlashIcon = () => {
    switch (flashMode) {
      case 'on': return 'flash';
      case 'auto': return 'flash-outline';
      default: return 'flash-off';
    }
  };

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <Ionicons name="camera-outline" size={60} color={COLORS.white} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            Please allow access to your camera to continue using this feature.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
            <Ionicons name="images-outline" size={24} color={COLORS.white} style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Select from Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />
      <Animated.View 
        style={[
          styles.cameraContainer,
          { transform: [{ translateX: shakeAnimation }] }
        ]}
      >
        <CameraView 
          style={styles.camera} 
          ref={cameraRef}
          facing={facing}
        >
          {/* Camera guides overlay */}
          <View style={styles.guideFrame}>
            <View style={styles.horizontalGuide} />
            <View style={styles.verticalGuide} />
          </View>

          {/* Top controls */}
          <View style={styles.topControlsContainer}>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={onClose}
            >
              <Ionicons name="close" size={26} color={COLORS.white} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={toggleFlashMode}
            >
              <Ionicons name={getFlashIcon()} size={26} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          
          {/* Capture guidance text */}
          <View style={styles.guidanceContainer}>
            <Text style={styles.guidanceText}>
              Position food in the center of the frame
            </Text>
          </View>

          {/* Bottom controls */}
          <View style={styles.bottomControlsContainer}>
            <TouchableOpacity 
              style={styles.galleryCTA} 
              onPress={pickImage}
            >
              <Ionicons name="images" size={28} color={COLORS.white} />
              <Text style={styles.galleryLabel}>Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePicture}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="large" color={COLORS.white} />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.galleryCTA} 
              onPress={toggleCameraFacing}
            >
              <Ionicons name="camera-reverse" size={28} color={COLORS.white} />
              <Text style={styles.galleryLabel}>Flip</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  topControlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guidanceContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  guidanceText: {
    color: COLORS.white,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 14,
    fontWeight: '500',
    overflow: 'hidden',
  },
  guideFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  horizontalGuide: {
    position: 'absolute',
    width: '70%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  verticalGuide: {
    position: 'absolute',
    width: 1,
    height: '70%',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  bottomControlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  galleryCTA: {
    alignItems: 'center',
  },
  galleryLabel: {
    color: COLORS.white,
    marginTop: 5,
    fontSize: 12,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(211, 47, 47, 0.5)', // Translucent red
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  permissionContent: {
    width: '80%',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  permissionTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionText: {
    color: COLORS.white,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.8,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  galleryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.7,
  },
});

export default CameraComponent; 