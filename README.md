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
