# KIG-006 — 주정답 ↔ 한국어 프롬프트 일치 검증 (Korean concordance)

괄호 친 한정사(detached determiner)는 저자의 '선택사항' 표기다.
한국어 프롬프트에 그/어떤 이 없으면 **주정답은 한정사 없는 형태(bare)** 여야 한다.
이 표가 그 판정의 근거다. (assert 5종은 구조만 보므로 이 부류를 잡지 못한다.)

| page | # | EN (원문) | 주정답 (proposed) | 대안 | KO 프롬프트 | KO에 그/어떤 | 판정 |
|---|---|---|---|---|---|---|---|
| gh1-012-1 | 7 | Those (The) books are theirs. | Those books are theirs. | — | 그 책들은 그들의 것들이다. | YES | REVIEW |
| gh1-012-1 | 10 | That (The) house is mine. | That house is mine. | — | 저 집은 나의 것이다. | YES | REVIEW |
| gh1-014-2 | 38 | Each (Every) student has his own room. | Each student has his own room. | — | 모든 학생이 각각 자기 방이 있다. (each) | no | OK |
| gh1-014-2 | 39 | He goes there each (every) year. | He goes there each year. | — | 그는 매년 그곳에 간다.(each year) | no | OK |
| gh1-050-2 | 32 | Is it (that) mine? | Is it mine? | Is it that mine? | 그것은 나의 것이냐? | no | OK |
| gh1-062 | 7 | Is that (the) car yours? | Is that car yours? | — | 그 차는 너의 것이냐? | YES | REVIEW |
| gh1-074 | 22 | Was that (the) land yours? | Was that land yours? | — | 그 땅은 너의 것이었니? | YES | REVIEW |
| gh1-098 | 109 | He is (a) Korean, isn't he? | He is Korean, isn't he? | He is a Korean, isn't he? | 그는 한국인이지? | no | OK |
| gh1-098 | 110 | He is not (a) Japanese, is he? | He is not Japanese, is he? | He is not a Japanese, is he? | 그는 일본인이 아니지? | no | OK |
| gh1-098 | 111 | She was (an) American, wasn't she? | She was American, wasn't she? | She was an American, wasn't she? | 그 여자는 미국인이었지? | YES | REVIEW |
| gh1-098 | 112 | She was not (a) Filipino, was she? | She was not Filipino, was she? | She was not a Filipino, was she? | 그 여자는 필리핀사람이 아니었지? | YES | REVIEW |
| gh1-120-2 | 21 | (The) Palestinians and (the) Israelis must act. | Palestinians and Israelis must act. | The Palestinians and the Israelis must act. / The Palestinians and Israelis must act. / Palestinians and the Israelis must act. | 팔레스타인인들과 이스라엘인들은 행동해야 한다. | YES | REVIEW |
| gh2-040-1 | 4 | Complaining was just about all (that) the opposition could do to the President. | Complaining was just about all the opposition could do to the President. | Complaining was just about all that the opposition could do to the President. | 불평하는 것이 야당이 대통령에게 할 수 있는 거의 전부였다. | no | OK |

총 13행, 판정 보류(REVIEW) 7건.

## REVIEW 7건 판정 (사람 검토 완료)

한국어의 그/저 가 **한정사**로 쓰였는지 **대명사**로 쓰였는지가 갈림길이다.
대명사(그것·그가·그는·그들)는 영어 한정사를 요구하지 않는다.

| page | # | KO의 그/저 | 왜 bare 주정답이 맞는가 |
|---|---|---|---|
| gh1-012-1 | 7 | 그 책들은 | 그=한정사이나 영어 `Those` 가 이미 밖에 있다. 괄호 `(The)` 는 동의어 주석. |
| gh1-012-1 | 10 | 저 집은 | 위와 동일. `That` 이 밖에 있다. |
| gh1-062 | 7 | 그 차는 | `That` 이 밖에 있다. 괄호 `(the)` 는 주석이며, `that the car` 는 비문. |
| gh1-074 | 22 | 그 땅은 | 위와 동일. `That` 이 밖에 있다. |
| gh1-098 | 111 | 그 여자는 | 그 는 **여자** 를 수식한다(=She). 국적 명사에는 한정사가 없다. |
| gh1-098 | 112 | 그 여자는 | 위와 동일. |
| gh1-120-2 | 21 | (없음) | 팔레스타인인들과 — 한정사 자체가 없다. |

결론: 7건 모두 **bare 주정답이 한국어와 일치**한다. 한정사를 주정답에 넣은 행은 0건.
assert 5종 + conservation + 이 표가 KIG-006 한정사 부류의 최종 검증이다.
