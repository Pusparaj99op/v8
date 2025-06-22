// Demo mode toggle for testing without authentication
// Only for development and Central India Hackathon 2.0 demo

// Add this to localStorage to bypass login: demoMode=true
export const isDemoMode = () => {
  return localStorage.getItem('demoMode') === 'true';
};

export const enableDemoMode = () => {
  localStorage.setItem('demoMode', 'true');
};

export const disableDemoMode = () => {
  localStorage.removeItem('demoMode');
};

export const getDemoUser = () => ({
  id: 'demo-user',
  email: 'demo@rescuenet.ai',
  userType: 'patient',
  name: 'Demo Patient',
});
