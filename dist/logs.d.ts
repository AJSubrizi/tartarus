export declare function logDir(): string;
export declare function jobLogPath(jobId: string): string;
export declare function ensureLogDir(): void;
export declare function writeJobLogHeader(jobId: string, header: string): void;
export declare function appendJobLog(jobId: string, chunk: string): void;
export declare function readJobLog(jobId: string, opts?: {
    tail?: number;
}): {
    path: string;
    exists: boolean;
    content: string;
};
