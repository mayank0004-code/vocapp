import { useState, useEffect } from 'react';

export function getLayout() {
  if (typeof window === 'undefined') return { layout: 'phone', isPhone: true, isTablet: false, isLaptop: false, isTouch: false };

  const isLaptop = window.matchMedia('(min-width: 1024px)').matches;
  const isTablet = !isLaptop && window.matchMedia('(min-width: 640px)').matches;
  const isPhone = !isLaptop && !isTablet;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;

  const layout = isLaptop ? 'laptop' : isTablet ? 'tablet' : 'phone';

  return { layout, isPhone, isTablet, isLaptop, isTouch };
}

export function useLayout() {
  const [layoutState, setLayoutState] = useState(getLayout);

  useEffect(() => {
    const laptopQuery = window.matchMedia('(min-width: 1024px)');
    const tabletQuery = window.matchMedia('(min-width: 640px) and (max-width: 1023px)');
    const touchQuery = window.matchMedia('(pointer: coarse)');

    const update = () => {
      setLayoutState(getLayout());
    };

    laptopQuery.addEventListener('change', update);
    tabletQuery.addEventListener('change', update);
    touchQuery.addEventListener('change', update);

    return () => {
      laptopQuery.removeEventListener('change', update);
      tabletQuery.removeEventListener('change', update);
      touchQuery.removeEventListener('change', update);
    };
  }, []);

  return layoutState;
}

export default useLayout;
