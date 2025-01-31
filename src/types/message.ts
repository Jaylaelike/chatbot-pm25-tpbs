export interface FlexMessage {
    type: string;
    hero: {
        type: string;
        url: string;
        size: string;
        aspectRatio: string;
        aspectMode: string;
        action: {
            type: string;
            uri: string;
        };
    };
    body: {
        type: string;
        layout: string;
        spacing: string;
        action: {
            type: string;
            uri: string;
        };
        contents: Array<{
            type: string;
            text: string;
            size?: string;
            weight?: string;
            margin?: string;
            flex?: number;
            align?: string;
            color?: string;
            wrap?: boolean;
        }>;
    };
}