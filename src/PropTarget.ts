export enum PropTargetKind {
    Unknown,
    Text,
    Section,
    BlockObject,
    InlineObject,
}

export interface PropTarget {
    kind: PropTargetKind;
    objectType?: string;
}
