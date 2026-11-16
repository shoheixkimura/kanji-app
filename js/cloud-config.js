// Firebase（Firestore）の接続先。空のままならクラウド同期は使われず、記録は端末内だけに保存される。
// Firebase コンソール → プロジェクトの設定 →「マイアプリ」の firebaseConfig から 2つを写す。
// （この2つは公開されてよい値。データを守るのは Firestore のセキュリティルールと「家族の合言葉」）
export const CLOUD = {
  projectId: '',
  apiKey: '',
};
