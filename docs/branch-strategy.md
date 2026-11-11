# 브랜치 전략

| 브랜치 | 용도 | 직접 push |
|---|---|---|
| `release` | 배포 브랜치 (기본 브랜치). 머지되면 GitLab Runner 가 자동 배포 | 금지 (MR 로만 머지) |
| `dev` | 개발 통합 브랜치. 평소 작업은 여기서 | 허용 |
| `feature/<작업명>` (선택) | 큰 작업을 나눌 때 `dev` 에서 분기 → `dev` 로 MR | 허용 |

## 작업 흐름

```bash
git switch dev
git pull
# ... 작업 ...
git add -A
git commit            # 커밋 메시지 규칙은 아래 참고
git push origin dev
```

배포할 때는 GitLab 에서 **`dev` → `release` Merge Request** 를 만든다.

1. MR 을 열면 파이프라인의 `build` 잡이 실행되어 배포 이미지가 빌드되는지 먼저 확인한다.
2. 리뷰 후 머지하면 `release` 파이프라인에서 `build` → `deploy` 가 실행된다.
3. 배포 결과는 GitLab **Deploy > Environments > production** 에서 확인한다.

## GitLab 설정 (최초 1회)

- Settings > Repository > Branch defaults: 기본 브랜치를 `release` 로
- Settings > Repository > Protected branches: `release` 는 Allowed to push = No one, Allowed to merge = Maintainers

## 커밋 메시지 규칙

제목 한 줄 + 본문에 파일/폴더별 설명을 적는다.

```
제목 (무엇을 했는지 한 줄)

[추가 파일]
- 경로 : 역할 설명
[수정 파일]
- 경로 : 무엇을 바꿨는지
[삭제 파일]
- 경로 : 삭제 이유
[관련 폴더]
- 경로 : 폴더 역할
```
