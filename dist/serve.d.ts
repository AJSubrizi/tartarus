export declare function startHttpServer(port?: number, opts?: {
    open?: boolean;
}): Promise<{
    port: number;
    url: string;
}>;
