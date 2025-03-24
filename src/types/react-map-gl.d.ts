declare module 'react-map-gl/mapbox' {
  import { FunctionComponent, ReactNode, CSSProperties, MouseEvent } from 'react';
  
  export interface ViewState {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch?: number;
    bearing?: number;
    padding?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  }
  
  export interface ViewStateChangeEvent {
    viewState: ViewState;
    interactionState: any;
    oldViewState: ViewState;
    type?: string;
    originalEvent?: any;
  }
  
  interface MapProps {
    mapboxAccessToken: string;
    initialViewState?: ViewState;
    longitude?: number;
    latitude?: number;
    zoom?: number;
    bearing?: number;
    pitch?: number;
    minZoom?: number;
    maxZoom?: number;
    mapStyle?: string;
    style?: CSSProperties;
    onMove?: (event: ViewStateChangeEvent) => void;
    onLoad?: (event: any) => void;
    onClick?: (event: MapLayerMouseEvent) => void;
    children?: ReactNode;
  }
  
  interface MarkerProps {
    longitude: number;
    latitude: number;
    onClick?: (e?: MouseEvent<HTMLDivElement>) => void;
    children?: ReactNode;
    anchor?: string;
    style?: CSSProperties;
    className?: string;
  }
  
  interface PopupProps {
    longitude: number;
    latitude: number;
    closeOnClick?: boolean;
    closeButton?: boolean;
    onClose?: () => void;
    className?: string;
    children?: ReactNode;
    anchor?: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  }
  
  export interface MapRef {
    getMap: () => any;
    [key: string]: any;
  }
  
  export const Map: FunctionComponent<MapProps>;
  export const Marker: FunctionComponent<MarkerProps>;
  export const Popup: FunctionComponent<PopupProps>;
} 