# Guia de Publicação Mobile (Android) - Social Spot

Este guia explica como transformar o projeto em um aplicativo Android pronto para a Google Play Store.

## Pré-requisitos

1.  **Android Studio**: Baixe e instale a versão mais recente do [Android Studio](https://developer.android.com/studio).
2.  **SDK do Android**: Certifique-se de instalar o SDK Platform e Build-Tools no Android Studio.

## Configuração da API (Importante!)

Para que o aplicativo funcione no celular, ele precisa saber onde o servidor (backend) está hospedado.
O `localhost` do seu computador não funciona no celular.

1.  Abra o arquivo `frontend/.env.production`.
2.  Descomente e defina a variável `VITE_API_URL` com o endereço do seu servidor na nuvem.
    Exemplo:
    ```env
    VITE_API_URL=https://social-spot.onrender.com
    ```
    (Substitua pela URL real do seu deploy no Render ou outro serviço).

## Atualizando o Aplicativo

Sempre que você fizer alterações no código do frontend (React) ou mudar a configuração da URL, execute os seguintes comandos no terminal, dentro da pasta `frontend`:

```bash
# 1. Reconstruir o projeto web
npm run build

# 2. Sincronizar com a pasta Android
npx cap sync
```

## Testando no Android Studio

1.  Abra a pasta `android` no Android Studio:
    ```bash
    npx cap open android
    ```
2.  Conecte seu celular via USB (com Depuração USB ativada) ou crie um Emulador.
3.  Clique no botão **Run** (triângulo verde) no Android Studio.

## Gerando o APK/Bundle para a Play Store

Para publicar, você precisa gerar um **Signed App Bundle (.aab)**.

1.  No Android Studio, vá no menu **Build** > **Generate Signed Bundle / APK**.
2.  Selecione **Android App Bundle** e clique em Next.
3.  Em **Key store path**, crie uma nova chave (Create new...) se ainda não tiver uma.
    *   Guarde muito bem o arquivo `.jks` e as senhas! Se perder, não conseguirá atualizar o app na loja.
4.  Preencha as informações da chave e clique em Next.
5.  Selecione a variante **release** e clique em **Finish**.
6.  O Android Studio irá gerar o arquivo `.aab`.
7.  Acesse o [Google Play Console](https://play.google.com/console), crie seu app e faça o upload desse arquivo.

## Ícones e Splash Screen

Os ícones padrão do Capacitor estão em `frontend/android/app/src/main/res`.
Para personalizá-los, substitua os arquivos nas pastas `mipmap-*` e `drawable-*` ou use a ferramenta `capacitor-assets` (opcional).
