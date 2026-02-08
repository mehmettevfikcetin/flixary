# 🎬 Flixary

<div align="center">

[![Live Demo](https://img.shields.io/badge/demo-live-success?style=for-the-badge)](https://flixary.vercel.app)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
[![React](https://img.shields.io/badge/React-18.3-61dafb?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-10.14-orange?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff?style=for-the-badge&logo=vite)](https://vitejs.dev/)

**[English](#english)** | **[Türkçe](#türkçe)**

</div>

---

## English

### 📖 About

**Flixary** is a modern web application for tracking movies and TV series. Built with React and powered by TMDB API, it helps you organize your watchlist, discover new content, and connect with other movie enthusiasts.

### ✨ Features

- 🔍 **Smart Search** - Search movies and TV shows with advanced filters
- 📋 **Custom Lists** - Create and manage personalized watchlists
- ⭐ **Rating System** - Rate and review your watched content
- 📊 **Watch Status** - Track your progress (Watching, Completed, Planned, On Hold, Dropped)
- 🌐 **Multi-language Support** - English titles for anime and Asian content
- 👥 **Social Features** - Follow users and explore their lists
- 🎯 **Smart Recommendations** - Discover similar content based on your preferences
- 📱 **Responsive Design** - Optimized for all devices

### 🛠️ Tech Stack

**Frontend:**
- React 18.3
- Vite 5.4
- React Router DOM 6.28
- Axios

**Backend:**
- Firebase Authentication
- Cloud Firestore
- Firebase Hosting

**APIs:**
- TMDB API v3

**Styling:**
- Custom CSS with CSS Variables
- React Icons

**Deployment:**
- Vercel

### 🚀 Getting Started

#### Prerequisites

- Node.js 16+ and npm
- Firebase account
- TMDB API key

#### Installation

1. Clone the repository:
```bash
git clone https://github.com/mehmettevfikcetin/flixary.git
cd flixary
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in the root directory:
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

4. Update TMDB API key in source files:
   - Replace `API_KEY` in `src/utils/tmdbUtils.js`

5. Run development server:
```bash
npm run dev
```

6. Build for production:
```bash
npm run build
```

### 📂 Project Structure

```
flixary/
├── public/
│   ├── logo.png
│   └── favicon.png
├── src/
│   ├── components/
│   │   ├── AddToListModal.jsx
│   │   ├── ConfirmModal.jsx
│   │   ├── FilterBar.jsx
│   │   ├── Footer.jsx
│   │   ├── MediaCard.jsx
│   │   ├── Navbar.jsx
│   │   ├── RatingModal.jsx
│   │   ├── StatsCard.jsx
│   │   ├── StatusModal.jsx
│   │   └── Toast.jsx
│   ├── pages/
│   │   ├── CustomListDetail.jsx
│   │   ├── Discover.jsx
│   │   ├── MediaDetail.jsx
│   │   ├── Profile.jsx
│   │   ├── Search.jsx
│   │   ├── Settings.jsx
│   │   └── UserSearch.jsx
│   ├── utils/
│   │   └── tmdbUtils.js
│   ├── App.jsx
│   ├── App.css
│   ├── Home.jsx
│   ├── Login.jsx
│   ├── firebase.js
│   ├── index.css
│   └── main.jsx
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── vercel.json
└── vite.config.js
```

### 🔧 Configuration

#### Firebase Rules

Update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if true;
      allow create, update: if request.auth != null && request.auth.uid == userId;
      allow delete: if false;
    }
    match /watchlist/{entryId} {
      allow read: if true;
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
      allow update: if request.auth != null && resource.data.uid == request.auth.uid;
      allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
    }
    match /customLists/{listId} {
      allow read: if true;
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
      allow update: if request.auth != null && resource.data.uid == request.auth.uid;
      allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
    }
    match /follows/{followId} {
      allow read: if true;
      allow create: if request.auth != null && request.resource.data.followerId == request.auth.uid;
      allow update: if false;
      allow delete: if request.auth != null && resource.data.followerId == request.auth.uid;
    }
  }
}
```

### 🌟 Key Features Explained

#### Smart Title Selection
The app intelligently selects titles based on language and character set:
1. English title (from parallel TMDB API call)
2. Original title (if Latin characters)
3. Turkish title (if Latin characters)
4. Fallback to any available title

This ensures anime and Asian content displays English titles instead of Japanese/Korean characters.

#### Social Features
- Follow other users
- View public watchlists
- Discover what others are watching
- Share custom lists

### 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### 👨‍💻 Developer

**Mehmet Tevfik Çetin**

[![GitHub](https://img.shields.io/badge/GitHub-mehmettevfikcetin-181717?style=flat&logo=github)](https://github.com/mehmettevfikcetin)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-mehmettevfikcetin-0077b5?style=flat&logo=linkedin)](https://linkedin.com/in/mehmettevfikcetin)
[![Twitter](https://img.shields.io/badge/Twitter-mehmettevfikcetin-1da1f2?style=flat&logo=twitter)](https://twitter.com/mehmettevfikcetin)

### 🙏 Acknowledgments

- [TMDB](https://www.themoviedb.org/) for the comprehensive movie and TV data API
- [Firebase](https://firebase.google.com/) for backend services
- [Vercel](https://vercel.com/) for hosting
- [React Icons](https://react-icons.github.io/react-icons/) for beautiful icons

---

## Türkçe

### 📖 Hakkında

**Flixary**, film ve dizi takibi için modern bir web uygulamasıdır. React ile geliştirilmiş ve TMDB API ile desteklenen uygulama, izleme listenizi düzenlemenize, yeni içerikler keşfetmenize ve diğer film tutkunlarıyla bağlantı kurmanıza yardımcı olur.

### ✨ Özellikler

- 🔍 **Akıllı Arama** - Gelişmiş filtrelerle film ve dizi arama
- 📋 **Özel Listeler** - Kişiselleştirilmiş izleme listeleri oluşturma ve yönetme
- ⭐ **Puanlama Sistemi** - İzlediğiniz içerikleri puanlama ve değerlendirme
- 📊 **İzleme Durumu** - İlerlemenizi takip etme (İzleniyor, Tamamlandı, Planlandı, Beklemede, Bırakıldı)
- 🌐 **Çoklu Dil Desteği** - Anime ve Asya içerikleri için İngilizce başlıklar
- 👥 **Sosyal Özellikler** - Kullanıcıları takip etme ve listelerini keşfetme
- 🎯 **Akıllı Öneriler** - Tercihlerinize göre benzer içerikler keşfetme
- 📱 **Duyarlı Tasarım** - Tüm cihazlar için optimize edilmiş

### 🛠️ Teknolojiler

**Frontend:**
- React 18.3
- Vite 5.4
- React Router DOM 6.28
- Axios

**Backend:**
- Firebase Authentication
- Cloud Firestore
- Firebase Hosting

**API'ler:**
- TMDB API v3

**Stil:**
- CSS Variables ile Özel CSS
- React Icons

**Deployment:**
- Vercel

### 🚀 Başlangıç

#### Gereksinimler

- Node.js 16+ ve npm
- Firebase hesabı
- TMDB API anahtarı

#### Kurulum

1. Depoyu klonlayın:
```bash
git clone https://github.com/mehmettevfikcetin/flixary.git
cd flixary
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

3. Kök dizinde `.env` dosyası oluşturun:
```env
VITE_FIREBASE_API_KEY=firebase_api_anahtariniz
VITE_FIREBASE_AUTH_DOMAIN=auth_domain
VITE_FIREBASE_PROJECT_ID=proje_id
VITE_FIREBASE_STORAGE_BUCKET=storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=sender_id
VITE_FIREBASE_APP_ID=app_id
```

4. Kaynak dosyalarda TMDB API anahtarını güncelleyin:
   - `src/utils/tmdbUtils.js` dosyasındaki `API_KEY`'i değiştirin

5. Geliştirme sunucusunu çalıştırın:
```bash
npm run dev
```

6. Production için build:
```bash
npm run build
```

### 🌟 Önemli Özellikler

#### Akıllı Başlık Seçimi
Uygulama, dil ve karakter setine göre başlıkları akıllıca seçer:
1. İngilizce başlık (paralel TMDB API çağrısından)
2. Orijinal başlık (Latin karakterler içeriyorsa)
3. Türkçe başlık (Latin karakterler içeriyorsa)
4. Mevcut herhangi bir başlığa geri dönüş

Bu sayede anime ve Asya içerikleri Japonca/Korece karakterler yerine İngilizce başlıklarla görüntülenir.

#### Sosyal Özellikler
- Diğer kullanıcıları takip etme
- Herkese açık izleme listelerini görüntüleme
- Başkalarının ne izlediğini keşfetme
- Özel listeleri paylaşma

### 📝 Lisans

Bu proje MIT Lisansı altında lisanslanmıştır - detaylar için [LICENSE](LICENSE) dosyasına bakın.

### 👨‍💻 Geliştirici

**Mehmet Tevfik Çetin**

[![GitHub](https://img.shields.io/badge/GitHub-mehmettevfikcetin-181717?style=flat&logo=github)](https://github.com/mehmettevfikcetin)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-mehmettevfikcetin-0077b5?style=flat&logo=linkedin)](https://linkedin.com/in/mehmettevfikcetin)
[![Twitter](https://img.shields.io/badge/Twitter-mehmettevfikcetin-1da1f2?style=flat&logo=twitter)](https://twitter.com/mehmettevfikcetin)

### 🙏 Teşekkürler

- Kapsamlı film ve dizi verisi API'si için [TMDB](https://www.themoviedb.org/)
- Backend servisleri için [Firebase](https://firebase.google.com/)
- Hosting için [Vercel](https://vercel.com/)
- Güzel ikonlar için [React Icons](https://react-icons.github.io/react-icons/)

---

<div align="center">

**⭐ Projeyi beğendiyseniz yıldız vermeyi unutmayın!**

**⭐ If you like this project, don't forget to give it a star!**

Made with ❤️ by Mehmet Tevfik Çetin

</div>
