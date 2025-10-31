"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

interface ImgboxImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Converte URL do imgbox.com para URL de imagem direta
 * Baseado no padrão observado: https://imgbox.com/ID -> usar API de proxy ou embed
 */
function getImgboxDirectUrl(url: string): string {
  if (!url) return "";

  // Se já é uma URL de imagem direta, retorna como está
  if (
    url.includes("images2.imgbox.com") ||
    url.includes("thumbs2.imgbox.com") ||
    url.includes("images.imgbox.com") ||
    url.startsWith("/images/") ||
    (url.startsWith("http") && !url.includes("imgbox.com/"))
  ) {
    return url;
  }

  // Extrai o ID do imgbox
  const match = url.match(/imgbox\.com\/([a-zA-Z0-9]+)/);
  if (!match) return url;

  const imageId = match[1];

  // O imgbox usa um hash específico nos seus servidores CDN
  // Não conseguimos recriar o hash exato, então vamos usar a imagem original
  // que tem padrão mais simples e direto
  // Exemplo real fornecido: CXu9gnDk -> 3c/f4

  // Tentativa 1: usar os próprios caracteres do ID como subpastas
  const sub1 = imageId.substring(0, 2).toLowerCase();
  const sub2 = imageId.substring(2, 4).toLowerCase();

  // Formato: https://images2.imgbox.com/xu/9g/CXu9gnDk_o.png
  return `https://images2.imgbox.com/${sub1}/${sub2}/${imageId}_o.png`;
}

/**
 * Componente que renderiza imagens do imgbox.com
 * Converte URLs do formato https://imgbox.com/ID para o formato renderizável
 */
export default function ImgboxImage({
  src,
  alt,
  width,
  height,
  fill,
  style,
  className,
}: ImgboxImageProps) {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadImage() {
      setLoading(true);

      // Se não é uma URL do imgbox, usa diretamente
      if (
        !src ||
        !src.includes("imgbox.com/") ||
        src.includes("images2.imgbox.com") ||
        src.includes("thumbs2.imgbox.com")
      ) {
        setImageUrl(src);
        setLoading(false);
        return;
      }

      try {
        // Usa o endpoint de proxy para extrair a URL real
        const response = await fetch(
          `/api/imgbox-proxy?url=${encodeURIComponent(src)}`
        );

        if (!response.ok) {
          throw new Error("Erro ao buscar imagem");
        }

        const data = await response.json();
        setImageUrl(data.imageUrl || src);
      } catch (err) {
        console.error("Erro ao carregar imagem do imgbox:", err);
        // Fallback: tenta usar URL direta construída
        setImageUrl(getImgboxDirectUrl(src));
      } finally {
        setLoading(false);
      }
    }

    loadImage();
  }, [src]);

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f5",
          width: fill ? "100%" : width || 300,
          height: fill ? "100%" : height || 300,
          position: fill ? "absolute" : "relative",
          top: fill ? 0 : undefined,
          left: fill ? 0 : undefined,
          right: fill ? 0 : undefined,
          bottom: fill ? 0 : undefined,
        }}
        className={className}
      >
        <span style={{ color: "#999", fontSize: "12px" }}>Carregando...</span>
      </div>
    );
  }

  // Se não há URL válida, não renderiza nada
  if (!imageUrl || imageUrl === "") {
    return (
      <div
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f0f0f0",
          width: width || "100%",
          height: height || "100%",
        }}
        className={className}
      >
        <span style={{ color: "#999", fontSize: "12px" }}>
          URL de imagem inválida
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f0f0f0",
          width: width || "100%",
          height: height || "100%",
        }}
        className={className}
      >
        <span style={{ color: "#999", fontSize: "12px" }}>
          Imagem não disponível
        </span>
      </div>
    );
  }

  if (fill) {
    return (
      <Image
        src={imageUrl}
        alt={alt}
        fill
        style={{
          objectFit: "cover",
          ...style,
        }}
        className={className}
        onError={() => setError(true)}
        unoptimized // imgbox é um domínio externo
      />
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={width || 300}
      height={height || 300}
      style={style}
      className={className}
      onError={() => setError(true)}
      unoptimized // imgbox é um domínio externo
    />
  );
}
