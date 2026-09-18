# Minhas Finanças

Aplicativo Android de controle financeiro pessoal feito com Expo/React Native.

## Recursos principais

- Lançamentos de entradas e saídas.
- Categorias personalizadas.
- Controle de bancos, contas, carteira e cartão.
- Investimentos e renda passiva estimada.
- Metas financeiras.
- Relatórios semanais e mensais.
- Geração de PDF para enviar por WhatsApp, e-mail ou salvar.
- Área de conexão Google preparada para backup manual no Google Drive.

## Instalação do projeto

```bash
pnpm install
```

## Rodar em desenvolvimento

```bash
pnpm exec expo start
```

## Usar no PC

O APK é apenas para Android. Para usar no PC, rode a versão Web no navegador:

```bash
pnpm install
pnpm run build:web
pnpm run preview:web
```

Depois abra:

```txt
http://localhost:4173
```

No Windows, também existe o atalho:

```txt
abrir-no-pc-web.bat
```

Observação: os dados salvos no navegador do PC ficam separados dos dados salvos no app Android, a menos que seja criado/ativado um backup e restauração entre os dois.

## Gerar APK pelo EAS

```bash
eas build --platform android --profile preview
```

## Observação sobre dados do usuário

O app usa o pacote Android:

```txt
com.financaspessoal.app
```

Para preservar os dados já cadastrados no celular, instale atualizações por cima do app atual e não desinstale o app antigo.

## Google Drive

A tela de conexão Google já existe no app, mas para conectar de verdade é necessário configurar os Client IDs do Google Cloud:

```env
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

Veja detalhes em [CONFIGURAR_GOOGLE.md](./CONFIGURAR_GOOGLE.md).

## Arquivos que não devem ir para o GitHub

Não envie:

- `node_modules/`
- `.pnpm-store/`
- `.corepack/`
- `.expo/`
- `.env`
- chaves como `.jks`, `.pem`, `.p8`, `.p12`, `.key`

Esses itens já estão ignorados no `.gitignore` / `.easignore`.
