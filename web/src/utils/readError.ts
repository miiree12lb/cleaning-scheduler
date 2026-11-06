export async function readError(res: Response, fallback: string): Promise<string> {
    const body: { error?: string } = await res.json().catch(() => ({}));
    return body.error ?? fallback;
}
