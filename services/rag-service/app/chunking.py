from .config import CHUNK_OVERLAP, CHUNK_SIZE


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    if chunk_size <= 0:
        return [text]
    if overlap < 0:
        overlap = 0
    if overlap >= chunk_size:
        overlap = max(0, chunk_size - 1)

    chunks: list[str] = []
    start = 0
    text_len = len(text)
    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == text_len:
            break
        start = end - overlap
    return chunks or [text]
