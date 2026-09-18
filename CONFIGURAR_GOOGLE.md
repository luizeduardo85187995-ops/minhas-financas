# Configurar conexão com Google

O app já tem a tela **Planejar > Conectar conta Google**. Para o botão conectar de verdade em APK de produção, é preciso criar credenciais OAuth no Google Cloud.

## O que a função faz

- Abre login do Google pelo navegador seguro do Android.
- Lê apenas perfil básico: nome e e-mail.
- Pede permissão `drive.file` para criar arquivos no Google Drive.
- Envia um backup manual em JSON para o Drive quando você toca em **Backup no Drive**.
- Não salva senha.
- Não salva token permanente do Google; se o token expirar, basta reconectar.

## Dados do app Android

- Package name: `com.financaspessoal.app`
- Scheme do app: `financas`

## Variáveis necessárias

Preencha estas variáveis antes de gerar o APK:

```env
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

## Passo a passo no Google Cloud

1. Acesse o Google Cloud Console.
2. Crie ou selecione um projeto.
3. Ative a **Google Drive API**.
4. Configure a tela de consentimento OAuth.
5. Crie um Client ID do tipo **Android**:
   - Package name: `com.financaspessoal.app`
   - SHA-1: use o SHA-1 da chave de assinatura do EAS.
6. Crie um Client ID do tipo **Web application**.
7. Copie os Client IDs para as variáveis acima.
8. Gere uma nova build APK.

## Observação importante

Se as variáveis estiverem vazias, o app mostra a seção Google, mas exibe aviso de configuração pendente. Isso evita quebrar o app no celular enquanto as credenciais ainda não existem.
