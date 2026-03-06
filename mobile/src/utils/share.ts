import { Share, Platform } from 'react-native';

export async function doShare(
  text: string,
  onCopied?: (msg: string) => void,
): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (navigator.share) {
        await navigator.share({ text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        onCopied?.('Copied!');
      } else {
        window.prompt('Copy this:', text);
      }
    } else {
      await Share.share({ message: text });
    }
  } catch {}
}
