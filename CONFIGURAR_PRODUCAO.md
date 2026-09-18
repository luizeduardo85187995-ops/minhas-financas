# Configurar producao

## Cobertura completa B3

1. Crie uma conta em https://brapi.dev.
2. Copie o token no dashboard, em Chaves de API.
3. No servidor que roda `node server/serve.js`, configure:

```bash
BRAPI_TOKEN=seu_token
```

4. No build do APK, configure a URL desse servidor:

```bash
EXPO_PUBLIC_MARKET_API_URL=https://seu-dominio.com
```

O token fica no servidor. O APK chama `/api/quote`, `/api/assets` e `/api/market/indicators`.

## Open Finance e bancos

O app ja tem a aba Bancos funcionando sem mensalidade: o usuario cadastra os
saldos e pode ler notificacoes copiadas do banco. Isso nao substitui Open
Finance, mas permite lancar a primeira versao sem custo fixo.

Para puxar saldo real automaticamente em producao, use um provedor regulado ou
um parceiro habilitado:

1. Escolha Pluggy, Belvo, Klavi ou outro provedor de Open Finance.
2. Crie o backend do app. Nunca coloque chave Open Finance dentro do APK.
3. No backend, gere o token/widget de consentimento do provedor.
4. No app, abra o fluxo de consentimento e salve somente os dados necessarios.
5. Mantenha tela para o usuario revogar/remover a conexao.

Observacao: sandboxes costumam ser gratuitos para teste, mas producao com dados
reais normalmente exige plano pago ou contrato.

## Inteligencia artificial

Comece com as analises locais ja existentes no app. Quando for ativar IA real:

1. Crie um backend para receber os dados resumidos do usuario.
2. Guarde a chave da IA somente no backend.
3. Envie o minimo necessario: categorias, totais, datas e textos resumidos.
4. Mostre dicas educativas, sem prometer ganho financeiro.

## AdMob

1. Crie uma conta em https://apps.admob.com.
2. Cadastre o app Android.
3. Copie o App ID Android e o Ad unit ID de banner.
4. Troque em `app.json`:

```json
["react-native-google-mobile-ads", { "androidAppId": "ca-app-pub-...~..." }]
```

5. Configure o banner:

```bash
EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID=ca-app-pub-.../...
```

Enquanto estiver usando os IDs `3940256099942544`, o app mostra anuncios de teste e nao gera receita.

Recomendacao inicial:

- banner discreto nas telas;
- intersticial apenas em pausas naturais, com intervalo alto;
- nenhum texto pedindo clique em anuncio;
- testar sempre com anuncios de teste antes de publicar.

## Politica importante

Nao peca para usuarios clicarem em anuncios, nao coloque anuncios colados em botoes e nao clique nos seus proprios anuncios. Isso pode gerar trafego invalido e bloquear a conta.
