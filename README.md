# Hypewriter

작가를 위한 오프라인 글쓰기 도구입니다.

## 주요 기능

- 📝 **리치 텍스트 에디터**: Tiptap 기반의 깔끔한 편집 환경
- 🎹 **타자기 모드**: 현재 작성 중인 줄이 항상 화면 중앙에 고정
- 🎯 **집중 모드**: 작성 중인 단락 외 영역 흐리게 처리
- 📑 **각주 기능**: 문학 작품용 각주 (*, †, ‡ 등)
- 🔤 **커스텀 폰트**: 시스템에 설치된 모든 글꼴 사용 가능
- 📁 **프로젝트 관리**: Obsidian 스타일 사이드바로 챕터 관리
- 🌙 **다크 모드**: 밝은/어두운 테마 지원
- 💾 **자체 포맷**: `.hype` 확장자의 JSON 기반 프로젝트 파일

## 시작하기

### 필수 조건

- Node.js 18+
- Rust (최신 stable)
- Windows/macOS/Linux

### 설치

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run tauri dev

# 프로덕션 빌드
npm run tauri build
```

### OS별 시스템 의존성 (로컬 빌드)

Tauri 2와 font-kit가 네이티브 라이브러리를 사용하므로, 로컬에서 빌드하려면 OS별 시스템 패키지가 필요합니다.

**Linux (Debian/Ubuntu 계열)**

```bash
sudo apt-get install -y \
  libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev \
  librsvg2-dev patchelf libfreetype-dev libfontconfig1-dev
```

**macOS**: Xcode Command Line Tools만 있으면 충분합니다.

```bash
xcode-select --install
```

**Windows**: Microsoft C++ Build Tools (MSVC)가 필요합니다. Rustup이 자동으로 MSVC 툴체인을 선택합니다.

## 기술 스택

- **Frontend**: Vue 3, TypeScript, Vite, Tiptap, Pinia
- **Backend**: Tauri 2, Rust
- **폰트 감지**: font-kit

## 프로젝트 구조

```
hypewriter/
├── src/                    # Vue.js 프론트엔드
│   ├── components/
│   │   ├── editor/        # 에디터 관련 컴포넌트
│   │   └── sidebar/       # 사이드바 컴포넌트
│   ├── stores/            # Pinia 스토어
│   └── assets/            # CSS 등 정적 파일
├── src-tauri/             # Rust 백엔드
│   └── src/
│       └── lib.rs         # Tauri 커맨드
└── package.json
```

## 라이선스

MIT
