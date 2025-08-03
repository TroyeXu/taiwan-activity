declare module 'leaflet.markercluster' {
  import * as L from 'leaflet';

  namespace L {
    class MarkerClusterGroup extends L.LayerGroup {
      constructor(options?: MarkerClusterGroupOptions);
      addLayer(layer: L.Layer): this;
      removeLayer(layer: L.Layer): this;
      clearLayers(): this;
    }

    interface MarkerClusterGroupOptions {
      showCoverageOnHover?: boolean;
      zoomToBoundsOnClick?: boolean;
      spiderfyOnMaxZoom?: boolean;
      removeOutsideVisibleBounds?: boolean;
      spiderLegPolylineOptions?: L.PolylineOptions;
      clockHelpingCircleOptions?: L.CircleMarkerOptions;
      maxClusterRadius?: number | ((zoom: number) => number);
      disableClusteringAtZoom?: number;
      animate?: boolean;
      animateAddingMarkers?: boolean;
      chunkedLoading?: boolean;
      chunkInterval?: number;
      chunkDelay?: number;
      chunkProgress?: (processed: number, total: number, elapsed: number) => void;
      iconCreateFunction?: (cluster: L.MarkerCluster) => L.Icon | L.DivIcon;
    }

    interface MarkerCluster extends L.Marker {
      getAllChildMarkers(): L.Marker[];
      getChildCount(): number;
    }
  }

  const MarkerClusterGroup: typeof L.MarkerClusterGroup;
  export = MarkerClusterGroup;
  export { MarkerClusterGroup };
}
