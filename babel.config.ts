module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'nativewind/babel', // NativeWind (Tailwind for RN)
      'expo-router/babel', // Enables routing with expo-router
    ],
  };
};
