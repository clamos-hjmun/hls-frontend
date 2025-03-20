# DTrix ON

## 📂 프로젝트 구조

```
└─ 📦 src
  ├── 📂 1_app      : 프로바이더, 라우터, 전역 스타일, 전역 타입 선언
  ├── 📂 2_pages    : 애플리케이션 페이지
  ├── 📂 3_widgets  : 페이지에 사용되는 독립적인 UI 컴포넌트
  ├── 📂 4_features : 비즈니스 가치를 제공하는 재사용 가능한 기능 구현체
  ├── 📂 5_entities : 비즈니스 엔티티
  ├── 📂 6_shared   : 특정 비즈니스 로직에 종속되지 않은 재사용 가능한 컴포넌트와 유틸리티
```

🚀 개발 모드에서 `Ctrl+Shift+D`를 누르면 FSD 디버그 모드를 활성화할 수 있습니다.

[🔗 FSD 아키텍처 참고](https://feature-sliced.design/kr/docs/get-started/overview)

## 📝 Commit 메시지 규칙

### [Common]

#### 1. 커밋 메시지 형식

```
<type>[optional scope]: <description>

[optional body]
```

#### 2. 타입 (Type)

- feat : 새로운 기능 추가
- fix : 버그 수정
- docs : 문서 수정 (README, 주석 등)
- style : 코드 스타일 변경 (포맷팅, 세미콜론 추가 등, 기능 변경 없음)
- refactor : 코드 리팩토링 (기능 변화 없이 코드 구조 개선)
- rename : 파일명(or 폴더명)을 수정한 경우
- remove : 코드(파일)의 삭제가 있을 경우
- perf : 성능 개선
- test : 테스트 코드 추가 및 수정
- chore : 빌드, 패키지 관리 등 기타 변경 사항

#### 3. 옵션 (Scope)

변경 사항의 범위를 나타내는 선택 사항입니다. 괄호 안에 명시합니다.

#### 4. 본문 (Body)

필요한 경우, 변경 사항에 대해 왜 변경했는지를 설명합니다. 한 줄 띄우고 작성합니다.

#### 5. 예시

```
feat(api): 사용자 프로필 조회 기능 추가

사용자가 자신의 프로필을 API를 통해 가져올 수 있도록 새로운 엔드포인트를 추가했습니다.
```

[🔗 커밋 메시지 컨벤션 참고](https://www.conventionalcommits.org/en/v1.0.0/)

### [Pull Request]

#### 1. 커밋 메시지 형식

```
<description> (<youtrack issues id>) (#<pull request id>)
```

- description: 변경 사항을 간결하게 요약
- youtrack issues id: 관련 이슈 ID
- pull request id: PR 번호

#### 2. 예시

```
사용자 프로필 조회 기능 추가 (GJB-17) (#1)
```

## 🚀 프로젝트 실행 및 배포

### 의존성 설치

패키지 매니저로 npm을 사용합니다.

```bash
npm install
```

### 개발 서버 실행

다음 명령어로 `http://localhost:5173` 에 개발 환경을 실행할 수 있습니다

```bash
npm run dev
```

### 빌드

```bash
npm run build
```
