/*
 * Loading Screen Component - Shows loading state during app initialization
 * Provides branded loading experience for Rescue.net AI
 * 
 * Used during authentication checks and data loading
 */

import React from 'react';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';
import { Favorite } from '@mui/icons-material';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading Rescue.net AI...' 
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)',
        padding: 3,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          padding: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 400,
          width: '100%',
          borderRadius: 3,
        }}
      >
        {/* Logo/Brand */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 3,
          }}
        >
          <Favorite 
            sx={{ 
              fontSize: 40, 
              color: 'primary.main',
              marginRight: 1,
            }} 
          />
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 'bold',
              color: 'primary.main',
            }}
          >
            Rescue.net
          </Typography>
        </Box>

        {/* Tagline */}
        <Typography
          variant="subtitle1"
          sx={{
            textAlign: 'center',
            color: 'text.secondary',
            marginBottom: 3,
            fontStyle: 'italic',
          }}
        >
          AI-Powered Emergency Response
        </Typography>

        {/* Loading indicator */}
        <CircularProgress 
          size={50}
          thickness={4}
          sx={{ 
            marginBottom: 2,
            color: 'primary.main',
          }} 
        />

        {/* Loading message */}
        <Typography
          variant="body2"
          sx={{
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          {message}
        </Typography>

        {/* Subtitle */}
        <Typography
          variant="caption"
          sx={{
            textAlign: 'center',
            color: 'text.disabled',
            marginTop: 2,
          }}
        >
          Central India Hackathon 2.0
        </Typography>
      </Paper>
    </Box>
  );
};

export default LoadingScreen;
