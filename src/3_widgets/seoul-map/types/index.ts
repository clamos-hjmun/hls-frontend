type Feature = {
    type: string;
    arcs: number[][];
    properties: {
        adm_nm: string;
        adm_cd2: string;
        sgg: string;
        sido: string;
        sidonm: string;
        sggnm: string;
        adm_cd: string;
    };
};

type Station = {
    adm_cd2: number;
    nm: string;
    lat: number;
    lng: number;
    sggnm: string;
};

type Tooltip = {
    x: number;
    y: number;
    stations: TooltipStation[];
    addr: string;
    total: number;
    visible: boolean;
};

type TooltipStation = {
    nm: string;
    cnt: number;
};

type HoverTooltip = {
    x: number;
    y: number;
    name: string;
    visible: boolean;
};

type EnrichedStation = Station & { cnt: number };


export type { Feature, Station, Tooltip, TooltipStation, HoverTooltip, EnrichedStation };
