import { feature } from "topojson-client";

/**
 * TopoJSON을 GeoJSON FeatureCollection으로 변환
 */
export const convertTopoToGeo = (topoData: any) => {
    return feature(topoData, topoData.objects.geo_features);
};
