import { Platform, useWindowDimensions } from 'react-native';

/**
 * Responsive layout hook that provides breakpoint-aware maxWidth and layout flags.
 *
 * Breakpoints:
 * - Desktop (web, >1024px): maxWidth 1200, multi-column capable
 * - Tablet  (web, 769-1024px): maxWidth 768
 * - Mobile  (<769px or native): maxWidth 600 (current behavior preserved)
 */
export function useResponsiveLayout() {
  const { width: screenWidth } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  const isDesktop = isWeb && screenWidth > 1024;
  const isTablet = isWeb && screenWidth > 768 && screenWidth <= 1024;
  const isMobile = !isDesktop && !isTablet;

  const maxWidth = isDesktop ? 1200 : isTablet ? 900 : 600;
  const contentPadding = isDesktop ? 24 : isTablet ? 20 : undefined; // undefined = keep existing

  return {
    screenWidth,
    isWeb,
    isDesktop,
    isTablet,
    isMobile,
    maxWidth,
    contentPadding,
  } as const;
}
