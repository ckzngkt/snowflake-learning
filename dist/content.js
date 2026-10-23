// Snowflake 学習サイトの設定。仕組みは app.js（全サイト共通）。章の本文は lessons-core.js / lessons-de.js。
// 目的は SnowPro Core（COF-C03）と SnowPro Advanced: Data Engineer（DEA-C02）の受験準備。
// 本文は概念の理解が目的なので、式は使わず、言葉・図・具体例で説明する。SQL は「形を見る」ための短い例だけにする。
// 試験の情報は Snowflake 公式の認定ページで 2026-10-24 に確認したもの。
const table=(heads,rows,cls='')=>`<div class="tablewrap"><table class="${cls}"><thead><tr>${heads.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const note=(text)=>`<div class="note">${text}</div>`;
const flow=(items)=>`<div class="flow">${items.map((x,i)=>`${i?'<span class="connector" aria-hidden="true">→</span>':''}<div class="node ${i===items.length-1?'dark':''}">${x}</div>`).join('')}</div>`;
const tree=(root,kids)=>`<div class="tree"><div class="tree-root">${root}</div><div class="tree-kids">${kids.map(k=>`<div class="tree-kid"><b>${k[0]}</b>${k[1]?`<ul>${k[1].map(x=>`<li>${x}</li>`).join('')}</ul>`:''}</div>`).join('')}</div></div>`;
const sql=(code)=>`<pre><code>${code.trim().replace(/&/g,'&amp;').replace(/</g,'&lt;')}</code></pre>`;
const exam=(text)=>`<div class="note"><b>試験のポイント：</b>${text}</div>`;

// 試験の概要（公式の認定ページ、2026-10-24 確認）
const EXAMS=[
  {id:'core',name:'SnowPro Core（COF-C03）',short:'Core',
   domains:[['1.0','機能とアーキテクチャ',31],['2.0','アカウント管理とガバナンス',20],['3.0','ロード・アンロード・接続',18],['4.0','パフォーマンス・クエリ・変換',21],['5.0','データコラボレーション',10]]},
  {id:'de',name:'SnowPro Advanced: Data Engineer（DEA-C02）',short:'DE',
   domains:[['1.0','データ移動',28],['2.0','パフォーマンス最適化',19],['3.0','ストレージとデータ保護',14],['4.0','データガバナンス',14],['5.0','データ変換',25]]},
];

const SITE={key:'snowflake-learning-v1',shuffleOptions:true,name:'Snowflake Learning Lab',title:'Snowflake 入門と SnowPro 対策',logo:'S',
  fieldsNav:'Snowflakeの分野マップ',
  eyebrow:'SnowPro Core · Data Engineer 対策',
  heroTitle:'Snowflakeを、<br><em>仕組み</em>から理解して<br>合格する',
  lead:'SnowPro Core と SnowPro Advanced: Data Engineer の出題範囲に沿って、<br>アーキテクチャ・ロード・変換・性能・ガバナンスを、図と実験と練習問題で学びます。',
  heroLabel:'ストレージ・コンピュート・クラウドサービスの3層構造の図',
  heroVisual:`<div class="visual-label">THREE LAYERS, SEPARATED</div><div class="hv-row"><div class="hv-box hv-dark">クラウドサービス層<small>認証・最適化・メタデータ・結果キャッシュ</small></div></div><div class="hv-arrow">↓ ↑</div><div class="hv-row"><div class="hv-box">仮想ウェアハウス A<small>ETL 用 · Large</small></div><div class="hv-box">仮想ウェアハウス B<small>BI 用 · Small</small></div><div class="hv-box">仮想ウェアハウス C<small>分析用 · Medium</small></div></div><div class="hv-arrow">↓ ↑</div><div class="hv-row"><div class="hv-box">ストレージ層<small>マイクロパーティション（列指向・圧縮）</small></div></div><span class="hv-note">概念図 · 計算（ウェアハウス）を、データを共有したまま別々に増やせる</span>`,
  facts:[['22','Core 15章 · DE 7章'],['2','対象の試験'],['110','練習問題（模擬試験に使用）']],
  teaser:['まずは全体像から','Snowflakeには、どんな機能がある？','アーキテクチャ・取り込み・変換・性能・保護・ガバナンスの地図'],
  homeExtra:`<div class="sectionhead"><h2>2つの試験の概要</h2><small>公式の認定ページで 2026-10-24 に確認</small></div>
<div class="tablewrap"><table><thead><tr><th></th><th>SnowPro Core（COF-C03）</th><th>SnowPro Advanced: Data Engineer（DEA-C02）</th></tr></thead><tbody>
<tr><td>問題数・時間</td><td>100問 · 115分</td><td>65問 · 115分</td></tr>
<tr><td>形式</td><td>1つ選ぶ・複数選ぶ</td><td>1つ選ぶ・複数選ぶ・インタラクティブ</td></tr>
<tr><td>合格ライン</td><td>750（0〜1000の換算点）</td><td>750（0〜1000の換算点）</td></tr>
<tr><td>受験料</td><td>175米ドル</td><td>375米ドル</td></tr>
<tr><td>前提</td><td>なし（Snowflake の利用経験6か月以上が目安）</td><td>SnowPro Core 認定（実務経験2年以上が目安）</td></tr>
<tr><td>日本語</td><td>あり（COF-C03-JPN）</td><td>あり（DEA-C02-JPN）</td></tr>
<tr><td>領域と配点</td><td>1.0 機能とアーキテクチャ 31%<br>2.0 アカウント管理とガバナンス 20%<br>3.0 ロード・アンロード・接続 18%<br>4.0 パフォーマンス・クエリ・変換 21%<br>5.0 データコラボレーション 10%</td><td>1.0 データ移動 28%<br>2.0 パフォーマンス最適化 19%<br>3.0 ストレージとデータ保護 14%<br>4.0 データガバナンス 14%<br>5.0 データ変換 25%</td></tr>
</tbody></table></div>
<p class="sources" style="margin-top:-8px">採点対象外の問題が含まれることがあります。細かい出題項目は、公式の試験ガイド（認定ページからダウンロード）で確認してください。受験料や形式は変わることがあります。</p>`,
  steps:[['仕組みをつかむ。','章の図と表で、その機能が「何のために」「どこで動くか」を確認する。'],['実験と練習問題で確かめる。','分類やスライダーの実験で考え方を使い、理解チェックで試験の形に慣れる。'],['模擬試験で弱点を見つける。','領域ごとの正答率を見て、低い領域の章に戻る。可能なら無料トライアルで実際に手を動かす。']],
  stepsNote:'Core から順に進め、Core に合格してから Data Engineer の章に進むのがおすすめです。章と試験領域の対応は、公式の領域名と概要からこのサイトが整理したものです。',
  schedule:{title:'8週間の進め方（例）',small:'Core 4週 · Data Engineer 4週',weeks:['第1〜4章：アーキテクチャ・ウェアハウス・ストレージ・半構造化<br>＋ 模擬試験（Core 10問）','第5〜10章：ロール・認証・ガバナンス・ロード・接続<br>＋ 模擬試験（Core 20問）','第11〜15章：キャッシュ・性能・変換・保護・共有<br>→ Core 受験','第16〜22章：取り込み・データレイク・性能・保護・ガバナンス・変換<br>→ Data Engineer 受験']},
  examIntro:'各章の理解チェックから、ランダムに出題します。本番と同じく、選び終えてから最後にまとめて採点します。結果は領域ごとの正答率で表示するので、弱い領域の章に戻って復習しましょう。',
  examNote:'ここの問題は、このサイトの理解チェックから作ったもので、公式の問題ではありません。本番の合格ラインは換算点の750/1000で、正答率とは一致しません。目安として、各領域で8割以上を目指しましょう。',
  about:'Snowflake 公式ドキュメントと公式の認定ページをもとに、個人の学習用にまとめたものです。Snowflake 社の公式教材ではなく、試験問題とは関係ありません。Snowflake は機能の追加・変更が速いので、細かい仕様や上限値は最新の公式ドキュメントで確認してください。例はすべて架空です。',
  homeSources:['cert','docs','editions','quickstarts'],
};

const AREAS=[
  {id:'c1',name:'Core 1：機能とアーキテクチャ',lead:'3層構造・ウェアハウス・ストレージ・データの種類（配点 31%）'},
  {id:'c2',name:'Core 2：アカウント管理とガバナンス',lead:'ロールと権限・認証・コスト管理・ポリシー（配点 20%）'},
  {id:'c3',name:'Core 3：ロード・アンロード・接続',lead:'ステージ・COPY・Snowpipe・ドライバーとツール（配点 18%）'},
  {id:'c4',name:'Core 4：パフォーマンス・クエリ・変換',lead:'キャッシュ・クエリプロファイル・最適化機能・変換（配点 21%）'},
  {id:'c5',name:'Core 5：データコラボレーション',lead:'Time Travel・クローン・共有・リスティング（配点 10%）'},
  {id:'d1',name:'DE 1：データ移動',lead:'継続的な取り込み・データレイク・外部データ（配点 28%）'},
  {id:'d2',name:'DE 2：パフォーマンス最適化',lead:'症状から原因と打ち手を選ぶ（配点 19%）'},
  {id:'d3',name:'DE 3：ストレージとデータ保護',lead:'保持期間・クローン・レプリケーション（配点 14%）'},
  {id:'d4',name:'DE 4：データガバナンス',lead:'ポリシーを大規模に運用する（配点 14%）'},
  {id:'d5',name:'DE 5：データ変換',lead:'ストリーム・タスク・動的テーブル・Snowpark（配点 25%）'},
];

// [表示名, URL]
const D='https://docs.snowflake.com/en/';
const SOURCES={
  cert:['Snowflake · SnowPro 認定の一覧（公式）','https://learn.snowflake.com/en/certifications/'],
  core:['SnowPro Core（COF-C03）認定ページ','https://learn.snowflake.com/en/certifications/snowpro-core-c03/'],
  dea:['SnowPro Advanced: Data Engineer（DEA-C02）認定ページ','https://learn.snowflake.com/en/certifications/snowpro-advanced-dataengineer-C02/'],
  docs:['Snowflake Documentation','https://docs.snowflake.com/'],
  quickstarts:['Snowflake Developer Guides（ハンズオン）','https://www.snowflake.com/en/developers/guides/'],
  arch:['Key concepts and architecture',D+'user-guide/intro-key-concepts'],
  editions:['Snowflake editions',D+'user-guide/intro-editions'],
  wh:['Overview of warehouses',D+'user-guide/warehouses-overview'],
  mcw:['Multi-cluster warehouses',D+'user-guide/warehouses-multicluster'],
  cost:['Understanding compute cost',D+'user-guide/cost-understanding-compute'],
  micro:['Micro-partitions & data clustering',D+'user-guide/tables-clustering-micropartitions'],
  tabletypes:['Working with temporary and transient tables',D+'user-guide/tables-temp-transient'],
  views:['Overview of views',D+'user-guide/views-introduction'],
  semi:['Semi-structured data',D+'user-guide/semistructured-intro'],
  unstruct:['Unstructured data',D+'user-guide/unstructured-intro'],
  access:['Overview of access control',D+'user-guide/security-access-control-overview'],
  netpol:['Network policies',D+'user-guide/network-policies'],
  mfa:['Multi-factor authentication',D+'user-guide/security-mfa'],
  keypair:['Key-pair authentication',D+'user-guide/key-pair-auth'],
  resmon:['Resource monitors',D+'user-guide/resource-monitors'],
  usage:['Account Usage',D+'sql-reference/account-usage'],
  masking:['Column-level security（masking policies）',D+'user-guide/security-column-intro'],
  rowaccess:['Row access policies',D+'user-guide/security-row-intro'],
  tags:['Object tagging',D+'user-guide/object-tagging/introduction'],
  stages:['Choosing an internal stage',D+'user-guide/data-load-local-file-system-create-stage'],
  loadoverview:['Overview of data loading',D+'user-guide/data-load-overview'],
  copy:['COPY INTO &lt;table&gt;',D+'sql-reference/sql/copy-into-table'],
  unload:['Overview of data unloading',D+'user-guide/data-unload-overview'],
  snowpipe:['Snowpipe',D+'user-guide/data-load-snowpipe-intro'],
  streaming:['Snowpipe Streaming',D+'user-guide/snowpipe-streaming/data-load-snowpipe-streaming-overview'],
  connect:['Connecting to Snowflake',D+'guides-overview-connecting'],
  kafka:['Snowflake Connector for Kafka',D+'user-guide/kafka-connector'],
  results:['Using persisted query results',D+'user-guide/querying-persisted-results'],
  profile:['Query Profile',D+'user-guide/ui-snowsight-activity'],
  sos:['Search optimization service',D+'user-guide/search-optimization-service'],
  mv:['Materialized views',D+'user-guide/views-materialized'],
  qas:['Query acceleration service',D+'user-guide/query-acceleration-service'],
  udf:['User-defined functions',D+'developer-guide/udf/udf-overview'],
  procs:['Stored procedures',D+'developer-guide/stored-procedure/stored-procedures-overview'],
  snowpark:['Snowpark API',D+'developer-guide/snowpark/index'],
  timetravel:['Time Travel',D+'user-guide/data-time-travel'],
  failsafe:['Fail-safe',D+'user-guide/data-failsafe'],
  clone:['Cloning considerations',D+'user-guide/object-clone'],
  sharing:['About Secure Data Sharing',D+'user-guide/data-sharing-intro'],
  replication:['Introduction to replication and failover',D+'user-guide/account-replication-intro'],
  exttables:['External tables',D+'user-guide/tables-external-intro'],
  iceberg:['Apache Iceberg tables',D+'user-guide/tables-iceberg'],
  storageint:['Storage integrations（CREATE STORAGE INTEGRATION）',D+'sql-reference/sql/create-storage-integration'],
  streams:['Introduction to streams',D+'user-guide/streams-intro'],
  tasks:['Introduction to tasks',D+'user-guide/tasks-intro'],
  dt:['Dynamic tables',D+'user-guide/dynamic-tables-about'],
};

const FIELDS={
  eyebrow:'EXPLORE THE PLATFORM / SNOWFLAKE AT A GLANCE',
  title:'Snowflakeの<em>全体像</em>',
  summary:'機能を「どこで動くか」と「何のためにあるか」で6つの枝に分けて見渡します。<br>試験範囲の機能は、学べる章へのリンクがあります。',
  note:'この分け方は、このサイトで学びやすくするための整理です。試験の領域とは完全には一致しません。Snowflake は機能の追加が速いので、発展の枝の機能は公式ドキュメントで最新の状態を確認してください。',
  placeholder:'例：Snowpipe、クローン、マスキング',
  root:['Snowflake AI Data Cloud','ストレージとコンピュートを分けた、クラウドのデータ基盤'],
  branches:[
    {name:'アーキテクチャと計算資源',idea:'3つの層と、計算を担う仮想ウェアハウス',description:'Snowflake の土台です。ストレージ・コンピュート・クラウドサービスが分かれていることが、ほぼすべての機能の前提になります。',items:[
      ['3層アーキテクチャ','基本','データを置くストレージ層、計算する仮想ウェアハウス、全体を管理するクラウドサービス層に分かれています。','例：ETL 用と BI 用のウェアハウスを分けても、同じデータを読める。',1],
      ['エディション','基本','Standard・Enterprise・Business Critical・VPS の4つ。使える機能が変わります。','例：マルチクラスターウェアハウスや90日の Time Travel は Enterprise 以上。',1],
      ['仮想ウェアハウス','計算','クエリやロードを実行する計算資源。サイズ・自動停止・自動再開を設定します。','例：夜間バッチだけ Large にして、終わったら自動停止させる。',2],
      ['マルチクラスターウェアハウス','計算','同時に来るクエリが多いとき、同じサイズのクラスターを増やして待ちを減らします。','例：朝9時の BI ダッシュボード集中に、クラスターを自動で増やす。',2],
      ['マイクロパーティション','ストレージ','テーブルを列指向・圧縮で小さな単位に分けて保存し、範囲情報で不要な部分を読み飛ばします。','例：日付で絞り込むと、その日付を含まない単位は読まない（プルーニング）。',3],
    ]},
    {name:'データの種類と取り込み',idea:'どんなデータを、どうやって入れるか',description:'ファイル・半構造化データ・ストリームを、ステージと COPY・Snowpipe・Snowpipe Streaming で取り込みます。',items:[
      ['半構造化データ（VARIANT）','データの種類','JSON などをそのまま VARIANT 型の列に入れ、パスで取り出したり FLATTEN で行に展開したりします。','例：<code>raw:customer.name::string</code> で JSON の中の値を取り出す。',4],
      ['非構造化データ','データの種類','画像や PDF をステージに置き、ディレクトリテーブルやファイル URL で扱います。','例：契約書 PDF の一覧をディレクトリテーブルで検索する。',4],
      ['ステージ','取り込み','ロードするファイルの置き場所。ユーザー・テーブル・名前付きの内部ステージと、外部ステージがあります。','例：S3 のバケットを外部ステージとして登録する。',8],
      ['COPY INTO','取り込み','ステージのファイルを、ウェアハウスを使ってまとめてテーブルに入れます。逆向きでアンロードもできます。','例：毎晩、前日分の CSV をまとめてロードする。',9],
      ['Snowpipe','取り込み','ファイルが届くたびに、サーバーレスで自動的にロードします。','例：S3 にファイルが置かれた通知を受けて、数分以内にロードする。',16],
      ['Snowpipe Streaming','取り込み','ファイルを作らずに、行単位でテーブルに直接書き込みます。','例：Kafka のイベントを数秒の遅れでテーブルに入れる。',16],
      ['外部テーブル・Iceberg テーブル','データレイク','クラウドストレージにあるデータを、Snowflake に取り込まずに、またはオープンな形式のまま扱います。','例：データレイクの Parquet を Iceberg テーブルとして読む。',17],
    ]},
    {name:'変換と処理',idea:'入れたデータを、使える形に変える',description:'SQL に加え、変更の追跡（ストリーム）、定期実行（タスク）、宣言的なパイプライン（動的テーブル）、プログラム（UDF・プロシージャ・Snowpark）で変換します。',items:[
      ['UDF・ストアドプロシージャ','変換','SQL で書けない処理を関数や手続きとして登録します。Python・Java などでも書けます。','例：住所の正規化を Python の UDF にする。',13],
      ['ストリーム','変換','テーブルの変更（追加・更新・削除）を記録し、差分だけを処理できるようにします。','例：前回から増えた注文だけを集計表に反映する。',21],
      ['タスク','変換','SQL やプロシージャを、スケジュールや条件で自動実行します。つないでタスクグラフにできます。','例：ストリームにデータがあるときだけ、5分ごとに変換する。',21],
      ['動的テーブル','変換','結果の SELECT と許容できる遅れ（ターゲットラグ）を宣言すると、Snowflake が更新を管理します。','例：「10分以内の鮮度で集計表を保つ」と宣言するだけで更新される。',22],
      ['Snowpark','変換','Python などのデータフレーム API で書いた処理を、Snowflake の中で実行します。','例：pandas に近い書き方で、データを移さずに変換する。',22],
    ]},
    {name:'性能とコスト',idea:'速く、無駄なく動かす',description:'キャッシュを理解し、クエリプロファイルで原因を見つけ、ウェアハウスの調整や最適化機能を選びます。',items:[
      ['3つのキャッシュ','性能','結果キャッシュ（24時間）、ウェアハウスのローカルディスクのキャッシュ、メタデータの3つです。','例：同じクエリをデータが変わらないうちに再実行すると、結果キャッシュから返る。',11],
      ['クエリプロファイル','性能','クエリの実行計画と、時間がかかった処理・読んだ量・ディスクへのあふれ（スピル）を見る画面です。','例：リモートディスクへのスピルが多ければ、ウェアハウスを大きくする。',11],
      ['クラスタリングキー','性能','大きなテーブルで、よく絞り込む列の値が近い行を同じ単位に寄せ、プルーニングを効かせます。','例：数 TB の売上表を日付でクラスタリングする。',12],
      ['検索最適化・マテリアライズドビュー・クエリアクセラレーション','性能','少数行を探すクエリ、繰り返す重い集計、ときどき来る大きなスキャンを、それぞれ速くする機能です。','例：顧客 ID で1件探すクエリに検索最適化を使う。',18],
      ['リソースモニター','コスト','ウェアハウスのクレジット使用量に上限を設け、通知や停止を行います。','例：月の上限の9割で通知し、100%で停止する。',6],
    ]},
    {name:'セキュリティ・ガバナンス・保護',idea:'誰が、何を、どこまで見られるか。失ったときにどう戻すか',description:'ロールと権限、認証、ネットワーク、ポリシー、タグで守り、Time Travel・Fail-safe・クローン・レプリケーションで保護します。',items:[
      ['ロールと権限（RBAC）','セキュリティ','権限をロールに与え、ロールをユーザーに与えます。システムロールの役割分担が試験の定番です。','例：テーブルを作るのは SYSADMIN 配下のロール、ユーザーを作るのは USERADMIN。',5],
      ['認証とネットワークポリシー','セキュリティ','MFA・SSO・キーペア認証と、接続元 IP などを制限するネットワークポリシーです。','例：サービス用のユーザーはキーペア認証にする。',6],
      ['マスキング・行アクセスポリシー・タグ','ガバナンス','列の値をロールに応じて隠し、行を絞り、タグで分類してポリシーを一括で当てます。','例：個人情報タグの付いた列は、人事ロール以外には伏せ字で見せる。',7],
      ['Time Travel・Fail-safe','保護','過去の時点のデータを読み、消したものを戻します。保持期間のあとは Fail-safe（Snowflake だけが復旧できる7日間）に移ります。','例：誤って削除したテーブルを UNDROP で戻す。',14],
      ['ゼロコピークローン','保護','データをコピーせずに、テーブルやデータベースの複製をすぐに作ります。','例：本番のデータベースをクローンして、テスト環境を数秒で作る。',14],
      ['レプリケーションとフェイルオーバー','保護','別のリージョンやクラウドのアカウントにデータベースなどを複製し、障害時に切り替えます。','例：東京の障害に備えて、大阪のアカウントに複製する。',19],
    ]},
    {name:'共有・アプリ・AI（発展を含む）',idea:'データを組織の外とつなぎ、アプリと AI に使う',description:'データをコピーせずに共有し、Marketplace で提供します。アプリや AI の機能も Snowflake の中で動きます。発展の項目は試験の中心ではありませんが、全体像として知っておくと役立ちます。',items:[
      ['セキュアデータシェアリング','共有','データをコピーせずに、別のアカウントに読み取り専用で見せます。','例：取引先のアカウントに、在庫データを共有する。',15],
      ['リスティングと Marketplace','共有','説明やサンプル付きでデータを提供する仕組みです。別リージョンへの提供や、公開・有償での提供に使います。','例：天気データを Marketplace で公開する。',15],
      ['リーダーアカウント','共有','Snowflake のアカウントを持たない相手のために、提供側が作って費用を払うアカウントです。','例：小さな取引先に、提供側の費用でデータを見せる。',15],
      ['Snowflake Cortex','AI（発展）','Snowflake の中で、LLM を使った関数や検索を SQL などから使える機能群です。','例：問い合わせ文を SQL の関数で要約・分類する。'],
      ['Streamlit in Snowflake・Notebooks','アプリ（発展）','Snowflake の中で、Python の Web アプリやノートブックを動かします。','例：分析結果を Streamlit のアプリで社内に見せる。'],
      ['Snowpark Container Services・Native Apps','アプリ（発展）','コンテナを Snowflake の中で動かしたり、アプリとして他のアカウントに配布したりします。','例：自社の分析アプリを、顧客のアカウントで動かせる形で配布する。'],
    ]},
  ],
  after:`<section class="guide"><h3>この地図から、どう学ぶ？</h3><p><b>Core の準備：</b>第1〜15章で、すべての枝の基本を一周します。</p><p><b>Data Engineer の準備：</b>第16〜22章で、取り込み・性能・保護・ガバナンス・変換を、設計と運用の目線で深めます。</p><p><b>実際に触る：</b>無料トライアルで、ウェアハウスの作成・ロード・クローン・ストリームとタスクを一度ずつ試すと、記憶に残りやすくなります。</p></section>`,
  sources:['docs','arch','editions'],
};

const LESSONS=[];
