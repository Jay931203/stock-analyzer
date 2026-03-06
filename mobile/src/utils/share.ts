import { Share, Platform } from 'react-native';

export async function doShare(
  text: string,
  onCopied?: (msg: string) => void,
  url?: string,
): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      const shareText = url ? `${text}\n\n${url}` : text;
      if (navigator.share) {
        await navigator.share({ text: shareText, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        onCopied?.('Copied!');
      } else {
        window.prompt('Copy this:', shareText);
      }
    } else {
      const message = url ? `${text}\n\n${url}` : text;
      await Share.share({ message });
    }
  } catch {}
}
