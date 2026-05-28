# Servis Plyn - Webová Aplikácia

Tento projekt bol vytvorený v Google AI Studio. Ide o React aplikáciu postavenú na Vite s integráciou Firebase.

## Ako spustiť projekt lokálne:

1.  **Rozbaľte ZIP archív.**
2.  **Otvorte terminál** v priečinku projektu.
3.  **Nainštalujte závislosti:**
    ```bash
    npm install
    ```
4.  **Spustite vývojový server:**
    ```bash
    npm run dev
    ```
5.  **Otvorte prehliadač** na adrese `http://localhost:3000`.

## Ako vytvoriť produkčný build:

Ak chcete aplikáciu nasadiť na Netlify, Vercel alebo iný hosting:
1.  Spustite príkaz:
    ```bash
    npm run build
    ```
2.  Obsah priečinka **`dist`** je to, čo treba nahrať na hosting.

## Konfigurácia Firebase:
Všetky potrebné kľúče sú už v súbore `firebase-applet-config.json`. Ak chcete použiť vlastný Firebase projekt, aktualizujte tento súbor.

## Poznámka k Netlify:
Pri nasadzovaní na Netlify nezabudnite v nastaveniach (Authorized domains) vo Firebase Console pridať vašu novú doménu, aby fungovalo Google prihlásenie.
