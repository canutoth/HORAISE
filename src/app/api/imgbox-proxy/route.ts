import { NextResponse } from "next/server";

/**
 * API Route que extrai a URL real da imagem do imgbox.com
 * Recebe: ?url=https://imgbox.com/ID
 * Retorna: { imageUrl: "https://thumbs2.imgbox.com/..." }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const imgboxUrl = searchParams.get("url");

    if (!imgboxUrl) {
      return NextResponse.json({ error: "URL não fornecida" }, { status: 400 });
    }

    // Extrai o ID da URL
    const match = imgboxUrl.match(/imgbox\.com\/([a-zA-Z0-9]+)/);
    if (!match) {
      return NextResponse.json({ error: "URL inválida" }, { status: 400 });
    }

    const imageId = match[1];

    // Faz requisição à página do imgbox para extrair a URL real da imagem
    const response = await fetch(`https://imgbox.com/${imageId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Erro ao buscar imagem do imgbox" },
        { status: 500 }
      );
    }

    const html = await response.text();

    // Procura pela URL da thumbnail na tag img ou link
    // Padrões possíveis:
    // <img src="https://thumbs2.imgbox.com/3c/f4/CXu9gnDk_t.jpg"
    // <a href=...><img src="https://thumbs2.imgbox.com/3c/f4/CXu9gnDk_t.jpg"
    const thumbnailMatch = html.match(
      /(https:\/\/thumbs\d*\.imgbox\.com\/[a-z0-9]+\/[a-z0-9]+\/[a-zA-Z0-9]+_t\.(jpg|png|jpeg|gif))/i
    );

    // Procura pela URL da imagem original
    // <img src="https://images2.imgbox.com/3c/f4/CXu9gnDk_o.png"
    const originalMatch = html.match(
      /(https:\/\/images\d*\.imgbox\.com\/[a-z0-9]+\/[a-z0-9]+\/[a-zA-Z0-9]+_o\.(jpg|png|jpeg|gif))/i
    );

    if (thumbnailMatch) {
      return NextResponse.json({
        imageUrl: thumbnailMatch[0],
        originalUrl: originalMatch ? originalMatch[0] : null,
      });
    } else if (originalMatch) {
      return NextResponse.json({
        imageUrl: originalMatch[0],
        originalUrl: originalMatch[0],
      });
    } else {
      return NextResponse.json(
        { error: "URL da imagem não encontrada no HTML" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Erro no proxy do imgbox:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
