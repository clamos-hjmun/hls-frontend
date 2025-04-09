import { useEffect, useMemo, useState } from "react";
import { Select, MenuItem, InputLabel, FormControl, Checkbox, FormControlLabel } from "@mui/material";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { Feature, Tooltip, TooltipStation, HoverTooltip, EnrichedStation } from "../types";
import { convertTopoToGeo, seoulTopoJson, dummyData } from "../lib";
import { FaMapPin } from "react-icons/fa";
import styles from "./SeoulMap.module.scss";
import * as d3 from "d3";

// ===================== Seoul Map 컴포넌트 =====================
export const SeoulMap = () => {
    const geoData: any = useMemo(() => convertTopoToGeo(seoulTopoJson), []);
    const districtList: string[] = useMemo(() => {
        const sggnms = geoData.features.map((f: Feature) => f.properties.sggnm);
        return Array.from(new Set(sggnms));
    }, [geoData]);

    const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({
        width: window.innerWidth,
        height: window.innerHeight,
    });
    const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
    const [selectedStationName, setSelectedStationName] = useState<string | null>(null);
    const [showStations, setShowStations] = useState<boolean>(true);
    const [mapCenter, setMapCenter] = useState<[number, number]>([126.986, 37.5665]);
    const [mapZoom, setMapZoom] = useState<number>(1);
    const [tooltip, setTooltip] = useState<Tooltip>({ x: 0, y: 0, stations: [], addr: "", total: 0, visible: false });
    const [hoverTooltip, setHoverTooltip] = useState<HoverTooltip>({ x: 0, y: 0, name: "", visible: false });
    const [enrichedData, setEnrichedData] = useState<EnrichedStation[]>(() =>
        dummyData.map(
            (item): EnrichedStation => ({
                ...item,
                cnt: Math.floor(Math.random() * 40) + 11,
            })
        )
    );

    // 윈도우 리사이즈 감지
    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // 지도 크기 설정
    const mapWidth = windowSize.width - 300; // 사이드바 고려
    const mapHeight = Math.min(windowSize.height * 0.8, 800); // 최대 800 제한

    /** 구역 마다 줌 레벨을 계산하는 함수 */
    const calculateZoomLevel = (bbox: [number, number, number, number]) => {
        const [minLng, minLat, maxLng, maxLat] = bbox;
        const width = maxLng - minLng;
        const height = maxLat - minLat;

        const seoulBounds = {
            minLng: 126.801,
            maxLng: 127.183,
            minLat: 37.413,
            maxLat: 37.703,
        };

        const maxWidth = seoulBounds.maxLng - seoulBounds.minLng;
        const maxHeight = seoulBounds.maxLat - seoulBounds.minLat;

        const widthRatio = maxWidth / width;
        const heightRatio = maxHeight / height;

        const zoom = Math.min(widthRatio, heightRatio) * 0.8;
        return Math.max(2.5, Math.min(zoom, 20));
    };

    /** 구역에 따라 필터링된 지리적 데이터 */
    const filteredGeographies = useMemo(() => {
        if (!selectedDistrict) {
            setMapCenter([126.986, 37.5665]); // 서울 전체 보기
            setMapZoom(1);
            return geoData.features;
        }

        const selectedFeatures = geoData.features.filter((f: Feature) => f.properties.sggnm === selectedDistrict);

        if (selectedFeatures.length > 0) {
            const geoCentroids = selectedFeatures.map((f: any) => d3.geoCentroid(f));
            const avgLng =
                (Math.max(...geoCentroids.map((d: any) => d[0])) + Math.min(...geoCentroids.map((d: any) => d[0]))) / 2;
            const avgLat =
                (Math.max(...geoCentroids.map((d: any) => d[1])) + Math.min(...geoCentroids.map((d: any) => d[1]))) / 2;

            const allCoords = selectedFeatures.flatMap((f: any) => d3.geoBounds(f));
            const lngs = allCoords.map((c: any) => c[0]);
            const lats = allCoords.map((c: any) => c[1]);

            const bbox: [number, number, number, number] = [
                Math.min(...lngs),
                Math.min(...lats),
                Math.max(...lngs),
                Math.max(...lats),
            ];

            // 지도 중심과 줌 레벨 설정
            setMapCenter([avgLng, avgLat]);
            setMapZoom(calculateZoomLevel(bbox));
        }

        return geoData.features.filter((f: Feature) => f.properties.sggnm === selectedDistrict);
    }, [geoData, selectedDistrict]);

    /** 업로드 수 랜덤 재설정 버튼 클릭 시 호출되는 함수 */
    const regenerateCounts = () => {
        const newData = dummyData.map((item) => ({
            ...item,
            cnt: Math.floor(Math.random() * 40) + 11,
        }));
        setEnrichedData(newData);
    };

    /** 선택된 구역에 따라 필터링된 파출소 데이터 */
    const filteredData = useMemo((): EnrichedStation[] => {
        if (!selectedDistrict) return enrichedData;
        return enrichedData.filter((d) => d.sggnm === selectedDistrict);
    }, [enrichedData, selectedDistrict]);

    /** 지역 데이터 맵 생성 */
    const regionDataMap = useMemo(() => {
        const map: Record<string, { total: number; stations: { nm: string; cnt: number }[] }> = {};
        enrichedData.forEach(({ adm_cd2, nm, cnt }) => {
            if (!map[adm_cd2]) map[adm_cd2] = { total: 0, stations: [] };
            map[adm_cd2].total += cnt;
            map[adm_cd2].stations.push({ nm, cnt });
        });
        return map;
    }, [enrichedData]);

    /** 지역 데이터 맵을 기반으로 색상 스케일 생성 */
    const colorScale = useMemo(() => {
        const counts = Object.values(regionDataMap).map((d) => d.total);
        const max = Math.max(...counts, 1);

        // Sequential 스케일 + YlOrRd 색상 보간 적용
        return d3.scaleSequential(d3.interpolateYlOrRd).domain([0, max]);
    }, [regionDataMap, enrichedData]);

    return (
        <div className={styles.mapContainer}>
            {/* 구 선택 셀렉트 박스 */}
            <DistrictSelectBox
                districtList={districtList}
                selectedDistrict={selectedDistrict}
                setSelectedDistrict={setSelectedDistrict}
            />

            <ComposableMap
                projection="geoMercator"
                projectionConfig={{ scale: 130000, center: [126.986, 37.5665] }}
                width={mapWidth}
                height={mapHeight}
                style={{ width: "calc(100% - 300px", height: "auto" }}
            >
                <ZoomableGroup center={mapCenter} zoom={mapZoom} minZoom={0.8} maxZoom={20}>
                    <Geographies geography={{ ...geoData, features: filteredGeographies }}>
                        {({ geographies }) =>
                            geographies.map((geo) => {
                                const addr = geo.properties.adm_nm;
                                const cd = geo.properties.adm_cd2;
                                const region = regionDataMap[cd];
                                const total = region?.total ?? 0;
                                const fill = colorScale(total);

                                return (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        fill={fill}
                                        stroke="#000"
                                        strokeWidth={0.1}
                                        style={{
                                            default: {
                                                outline: "none",
                                            },
                                            hover: {
                                                fill: d3.interpolateYlOrRd(0.9),
                                                cursor: "pointer",
                                                outline: "none",
                                                filter: "drop-shadow(0 0 4px rgba(0,0,0,0.2))",
                                            },
                                            pressed: {
                                                fill: d3.interpolateYlOrRd(1.0),
                                                outline: "none",
                                                filter: "drop-shadow(0 0 6px rgba(0,0,0,0.3))",
                                            },
                                        }}
                                        onMouseEnter={(e) => {
                                            const { clientX, clientY } = e;
                                            setTooltip({
                                                x: clientX,
                                                y: clientY,
                                                stations: region?.stations ?? [],
                                                addr,
                                                total,
                                                visible: true,
                                            });
                                        }}
                                        onMouseLeave={() => {
                                            setTooltip((prev) => ({ ...prev, visible: false }));
                                        }}
                                    />
                                );
                            })
                        }
                    </Geographies>

                    {/* 위경도 기반 마커 표시 */}
                    {showStations &&
                        filteredData
                            .filter((d) => d.lat && d.lng)
                            .map((station, idx) => {
                                const isHovering = hoverTooltip.name === station.nm && hoverTooltip.visible;

                                return (
                                    <Marker key={idx} coordinates={[station.lng, station.lat]}>
                                        <g
                                            transform="translate(-13, -21)"
                                            onMouseEnter={(e) =>
                                                setHoverTooltip({
                                                    x: e.clientX,
                                                    y: e.clientY,
                                                    name: station.nm,
                                                    visible: true,
                                                })
                                            }
                                            onMouseLeave={() =>
                                                setHoverTooltip((prev) => ({ ...prev, visible: false }))
                                            }
                                        >
                                            <FaMapPin
                                                size={22}
                                                color={
                                                    isHovering ? d3.interpolateYlOrRd(0.9) : d3.interpolateYlOrRd(0.6)
                                                }
                                                className={station.nm === selectedStationName ? styles.blinking : ""}
                                            />
                                        </g>
                                    </Marker>
                                );
                            })}
                </ZoomableGroup>
            </ComposableMap>

            {/* 마커 툴팁 */}
            {hoverTooltip.visible && (
                <div className={styles.tooltip} style={{ top: hoverTooltip.y + 10, left: hoverTooltip.x + 10 }}>
                    {hoverTooltip.name}
                </div>
            )}

            {/* 툴팁 */}
            {tooltip.visible && (
                <div className={styles.tooltip} style={{ top: tooltip.y + 10, left: tooltip.x + 10 }}>
                    <div>
                        <strong>파출소 목록 ({tooltip.addr})</strong>
                        <ul>
                            {tooltip.stations
                                .sort((a: TooltipStation, b: TooltipStation) => b.cnt - a.cnt)
                                .map((station, idx) => (
                                    <li key={idx}>
                                        {station.nm}: {station.cnt.toLocaleString()}
                                    </li>
                                ))}
                        </ul>
                        <div style={{ marginTop: "6px", fontWeight: "bold" }}>
                            총계: {tooltip.total.toLocaleString()}
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.sidebar}>
                <h3>업로드 순위</h3>
                <ul>
                    {filteredData
                        .slice()
                        .sort((a, b) => b.cnt - a.cnt)
                        .map((station, idx) => (
                            <li
                                key={`${station.nm}-${idx}`}
                                onClick={() => setSelectedStationName(station.nm)}
                                className={styles.sidebarItem}
                            >
                                <span className={styles.rank}>{idx + 1}.</span>{" "}
                                <span className={styles.name}>{station.nm}</span>
                                <span className={styles.count}>{station.cnt.toLocaleString()}</span>
                            </li>
                        ))}
                </ul>
            </div>
            <div className={styles.bottom}>
                {/* 파출소 위치 보기 라디오 버튼 - 지도 하단 */}
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={showStations}
                            onChange={(e) => setShowStations(e.target.checked)}
                            sx={{
                                color: "#ccc",
                                "&.Mui-checked": {
                                    color: "#ffcc00",
                                },
                            }}
                        />
                    }
                    label="파출소 위치 보기"
                    sx={{ color: "#eee", marginLeft: "8px" }}
                />
                {/* 업로드 수 랜덤 재설정 버튼 */}
                <button
                    onClick={regenerateCounts}
                    style={{
                        backgroundColor: "#333",
                        color: "#fff",
                        padding: "6px 12px",
                        border: "1px solid #555",
                        borderRadius: "6px",
                        cursor: "pointer",
                    }}
                >
                    업로드 수 랜덤 재설정
                </button>
            </div>
        </div>
    );
};

// ===================== District SelectBox컴포넌트 =====================

interface DistrictSelectBoxProps {
    districtList: string[];
    selectedDistrict: string | null;
    setSelectedDistrict: (district: string | null) => void;
}

const DistrictSelectBox = ({ districtList, selectedDistrict, setSelectedDistrict }: DistrictSelectBoxProps) => {
    return (
        <div className={styles.selectWrapper}>
            <FormControl
                size="small"
                sx={{
                    minWidth: 260,
                    borderRadius: 2,
                    color: "#f5f5f5",
                    "& .MuiInputBase-root": {
                        backgroundColor: "#2a2a2a",
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#555",
                    },
                }}
            >
                <InputLabel id="select-label" sx={{ color: "#bbb" }}>
                    구 선택
                </InputLabel>

                <Select
                    labelId="select-label"
                    id="timeline-select"
                    value={selectedDistrict ?? ""}
                    onChange={(e) => setSelectedDistrict(e.target.value || null)}
                    label="구 선택"
                    sx={{
                        color: "#f5f5f5",
                        "& .MuiSelect-icon": {
                            color: "#aaa",
                        },
                    }}
                >
                    <MenuItem value="">선택 안함</MenuItem>
                    {districtList.map((sggnm) => (
                        <MenuItem key={sggnm} value={sggnm}>
                            {sggnm}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </div>
    );
};
