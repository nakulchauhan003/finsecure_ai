type PluginOptions = {
    include?: string | string[];
    exclude?: string | string[];
    prefix?: string;
    enable?: boolean;
    attributes?: (info: {
        relativePath: string;
        line: number;
        column: number;
        tag: string;
    }) => Record<string, string>;
    filterTag?: string[] | ((tag: string) => boolean);
};

declare function viteSourceLocator(options?: PluginOptions): {
    name: string;
    enforce: "pre";
    apply: "serve";
    version: string;
    transform(code: string, id: string): Promise<{
        code: string;
        map?: any;
    } | undefined>;
};

export { viteSourceLocator };
