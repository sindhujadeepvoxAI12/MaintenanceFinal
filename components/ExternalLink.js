import { Link } from 'expo-router';
import { Linking } from 'react-native';

export function ExternalLink({ href, ...rest }) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={async (event) => {
        // Prevent the default behavior of linking to the default browser on native.
        event.preventDefault();
        // Open the link in the device's default browser.
        await Linking.openURL(href);
      }}
    />
  );
}
