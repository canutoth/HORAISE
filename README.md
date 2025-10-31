# 🚀 AISE Team Editor - Micro AppThis is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Micro aplicativo Next.js para edição em tempo real dos perfis da equipe AISE, com sincronização automática via Google Sheets.## Getting Started

## ✨ FuncionalidadesFirst, run the development server:

- 🔐 **Login por Email**: Verificação automática de cadastro existente```bash

- ✏️ **Editor JSON**: Edição em tempo real com validaçãonpm run dev

- 👁️ **Preview Múltiplo**: Visualização simultânea em 3 formatos diferentes# or

- 🔄 **Sincronização**: Integração direta com Google Sheets APIyarn dev

- ♻️ **Reset**: Restauração para template de exemplo mantendo email# or

- ✅ **Validação**: Verificação automática de campos obrigatóriospnpm dev

# or

## 🏗️ Estrutura do Projetobun dev

```

```

aise-sheets-team/Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

├── src/

│ ├── app/You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

│ │ ├── api/

│ │ │ └── update-member/This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

│ │ │ └── route.ts # API para atualizar Google Sheets

│ │ ├── edit-content/## Learn More

│ │ │ └── [personid]/

│ │ │ └── page.tsx # Página de ediçãoTo learn more about Next.js, take a look at the following resources:

│ │ ├── login/

│ │ │ └── page.tsx # Página de login- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.

│ │ ├── layout.tsx # Layout com MantineProvider- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

│ │ ├── page.tsx # Página inicial

│ │ └── globals.cssYou can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

│ ├── components/

│ │ ├── BadgeBox.tsx # Componente de badges## Deploy on Vercel

│ │ ├── LinkGroup.tsx # Componente de links sociais

│ │ └── PersonCard.tsx # Componente de card de pessoaThe easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

│ └── services/

│ └── googleSheets.ts # Serviço de integraçãoCheck out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

├── .env.local # Variáveis de ambiente (não commitar!)
├── .env.example # Exemplo de variáveis
├── next.config.ts
├── package.json
└── README.md

````

## 🔧 Configuração Inicial

### 1️⃣ Instalar Dependências

```bash
npm install
````

As seguintes dependências já estão configuradas:

- `@mantine/core` `@mantine/hooks` `@mantine/notifications` - UI Framework
- `@tabler/icons-react` - Ícones
- `framer-motion` - Animações
- `googleapis` - Integração com Google Sheets

### 2️⃣ Configurar Google Cloud

#### **A. API Key (para leitura)**

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione existente
3. Ative a **Google Sheets API**
4. Vá em **APIs e Serviços > Credenciais**
5. Clique em **Criar credenciais > Chave de API**
6. Copie a API Key gerada

#### **B. Service Account (para escrita)**

1. No Google Cloud Console, vá em **Credenciais**
2. Clique em **Criar credenciais > Conta de serviço**
3. Dê um nome (ex: "aise-team-editor")
4. Clique em **Criar e continuar**
5. Pule as permissões opcionais e clique em **Concluir**
6. Clique na conta de serviço criada
7. Vá em **Chaves > Adicionar chave > Criar nova chave**
8. Selecione **JSON** e clique em **Criar**
9. Baixe o arquivo JSON com as credenciais

### 3️⃣ Configurar Google Sheets

#### **Estrutura da Planilha**

Sua planilha deve ter **exatamente** estas colunas na linha 1 (header):

```
name | position | imageUrl | description | email | researchInterests | technologies | expertise | lattes | personalWebsite | linkedin | github | googleScholar | orcid
```

#### **⚠️ IMPORTANTE: Linha 2 (Dados de Exemplo)**

A **linha 2** deve conter dados de exemplo/mockados que serão usados como template. Exemplo:

| name            | position              | imageUrl                 | description                     | email               | researchInterests        | technologies       | expertise         | ... |
| --------------- | --------------------- | ------------------------ | ------------------------------- | ------------------- | ------------------------ | ------------------ | ----------------- | --- |
| Exemplo de Nome | Undergraduate Student | /images/team/example.jpg | Esta é uma descrição de exemplo | exemplo@example.com | AI, Software Engineering | Python, JavaScript | Backend, Frontend | ... |

#### **Compartilhar Planilha**

1. Abra sua planilha no Google Sheets
2. Clique em **Compartilhar**
3. Adicione o email da service account (ex: `aise-team-editor@projeto.iam.gserviceaccount.com`)
4. Dê permissão de **Editor**
5. Para leitura pública via API Key, deixe a planilha como **Qualquer pessoa com o link pode visualizar**

### 4️⃣ Configurar Variáveis de Ambiente

Edite o arquivo `.env.local` na raiz do projeto:

```env
# API Key (para leitura)
NEXT_PUBLIC_GOOGLE_SHEETS_ID=sua_planilha_id_aqui
NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY=sua_api_key_aqui
NEXT_PUBLIC_SHEET_NAME=Team

# Service Account (para escrita)
GOOGLE_SHEETS_ID=sua_planilha_id_aqui
SHEET_NAME=Team
GOOGLE_CLIENT_EMAIL=sua-service-account@projeto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave privada aqui\n-----END PRIVATE KEY-----\n"
```

**Como encontrar o ID da planilha:**

- Na URL: `https://docs.google.com/spreadsheets/d/SEU_ID_AQUI/edit`

**Como extrair credenciais do JSON:**

- Abra o arquivo JSON baixado
- `client_email` → `GOOGLE_CLIENT_EMAIL`
- `private_key` → `GOOGLE_PRIVATE_KEY` (mantenha as aspas e `\n`)

### 5️⃣ Iniciar o Servidor

```bash
npm run dev
```

Acesse: **http://localhost:3001**

## 🎯 Como Usar

### 1. Login

1. Acesse `http://localhost:3001/login`
2. Insira seu email
3. Se já cadastrado: carrega dados existentes
4. Se novo: cria perfil com dados de exemplo

### 2. Editar Perfil

1. **Painel Esquerdo**: Editor JSON
   - Edite os dados em formato JSON
   - Validação em tempo real
   - Arrays: `["item1", "item2"]`
2. **Painel Direito**: Preview
   - PersonCard (carrossel)
   - Lista de membros
   - Perfil completo

### 3. Salvar

- Clique em **Salvar Alterações**
- Dados são sincronizados no Google Sheets
- Notificação de sucesso/erro

### 4. Resetar

- Clique em **Resetar para Exemplo**
- Restaura dados de exemplo
- Mantém o email atual

## 📋 Formato dos Dados

### Campos Obrigatórios

```json
{
  "name": "Seu Nome Completo",
  "position": "PhD Student",
  "imageUrl": "https://exemplo.com/foto.jpg",
  "description": "Sua biografia aqui...",
  "email": "seu.email@exemplo.com"
}
```

### Campos Opcionais (Arrays)

```json
{
  "researchInterests": ["IA", "Software Engineering"],
  "technologies": ["Python", "JavaScript", "TypeScript"],
  "expertise": ["Backend", "Frontend", "Data Science"]
}
```

### Campos Opcionais (Links)

```json
{
  "lattes": "http://lattes.cnpq.br/...",
  "personalWebsite": "https://seusite.com",
  "linkedin": "https://linkedin.com/in/...",
  "github": "https://github.com/...",
  "googleScholar": "https://scholar.google.com/citations?user=...",
  "orcid": "https://orcid.org/..."
}
```

## 🛡️ Segurança

### ⚠️ NUNCA commite:

- `.env.local` com credenciais reais
- Arquivos JSON de service account
- Chaves privadas em código

### 🔒 Proteções implementadas:

- Email de exemplo não pode ser salvo
- Linha 2 da planilha (exemplo) não pode ser sobrescrita
- Validação de campos obrigatórios
- Autenticação OAuth2 para escrita

## 🐛 Troubleshooting

### ❌ Erro de CORS ao buscar dados

**Causa:** API Key incorreta ou planilha não compartilhada

**Solução:**

- Verifique se `NEXT_PUBLIC_GOOGLE_SHEETS_API_KEY` está correta
- Compartilhe a planilha publicamente (leitura)

### ❌ Erro 403 ao salvar

**Causa:** Service account sem permissão

**Solução:**

- Compartilhe a planilha com o email da service account
- Dê permissão de **Editor**
- Verifique se `GOOGLE_CLIENT_EMAIL` e `GOOGLE_PRIVATE_KEY` estão corretos

### ❌ Preview não atualiza

**Causa:** JSON inválido

**Solução:**

- Verifique a sintaxe JSON no editor
- Veja os erros no console (F12)
- Certifique-se de usar aspas duplas (`"`)

### ❌ Erro ao encontrar membro

**Causa:** Email não encontrado na planilha

**Solução:**

- Verifique se o email está correto
- Confira se a coluna de email está na posição correta (coluna E)

### ❌ Module not found

**Causa:** Dependências não instaladas

**Solução:**

```bash
rm -rf node_modules package-lock.json
npm install
```

## 📦 Scripts Disponíveis

```bash
npm run dev       # Inicia em modo desenvolvimento (porta 3001)
npm run build     # Cria build de produção
npm start         # Inicia servidor de produção (porta 3001)
npm run lint      # Verifica erros de código
```

## 🎨 Customização

### Cores Principais

Edite em `src/app/globals.css`:

```css
:root {
  --primary: #667eea;
  --secondary: #764ba2;
}
```

### Posições dos Membros

Adicione novas posições no array de validação em `src/services/googleSheets.ts`.

## 📝 Estrutura do Google Sheets

```
Linha 1 (Header): name | position | imageUrl | ...
Linha 2 (Exemplo): Exemplo de Nome | Undergraduate Student | ...
Linha 3+: Dados reais dos membros
```

**⚠️ Não edite ou delete as linhas 1 e 2!**

## 🤝 Contribuindo

1. Clone o repositório
2. Crie uma branch para sua feature
3. Faça suas alterações
4. Teste localmente
5. Crie um Pull Request

## 📄 Licença

Este é um projeto interno do **AISE Lab - PUC-Rio**.

## 🆘 Suporte

Se encontrar problemas:

1. Verifique a seção **Troubleshooting** acima
2. Confira os logs no console (F12)
3. Verifique as credenciais do Google Cloud
4. Entre em contato com a equipe AISE

---

**Desenvolvido com ❤️ pelo AISE Lab - PUC-Rio**

🔗 Links Úteis:

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Sheets API Docs](https://developers.google.com/sheets/api)
- [Mantine UI Docs](https://mantine.dev/)
- [Next.js Docs](https://nextjs.org/docs)
