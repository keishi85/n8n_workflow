// Step2. 画像検証・Base64エンコード
console.log('=== 領収書画像処理開始 ===');

try {
  // Google Driveからの元情報を保持
  const driveInfo = $input.first().json;
  const fileId = driveInfo.id;
  const fileName = driveInfo.name;
  const mimeType = driveInfo.mimeType;
  const parentFolders = driveInfo.parents || [];
  const binaryData = await this.helpers.getBinaryDataBuffer(0, 'data');

  if (!binaryData) {
    throw new Error('画像データが見つかりません。画像ファイルをアップロードしてください');
  }

  console.log('画像サイズ: ', binaryData.length, 'bytes');

  // 画像形式の検出
  const detectImageFormat = (buffer) => {
    const header = buffer.toString('hex', 0, 12);
    const base64Header = buffer.toString('base64', 0, 20);

    console.log('ファイルヘッダー: ', header);

    // 形式判定
    if (header.startsWith('ffd8ff')) {
      return { format: 'JPEG', supported: true, description: 'JPEG画像' };
    } else if (header.startsWith('89504e47')) {
      return { format: 'PNG', supported: true, description: 'PNG画像' };
    } else if (header.includes('667479706865696') || base64Header.includes('NGZ0eXBoZWljAAAA')) {
      return { format: 'HEIC', supported: false, description: 'HEIC画像 (iPhone等)' };
    } else if (header.includes('6674797068656966')) {
      return { format: 'HEIF', supported: false, description: 'HEIF画像' };
    } else {
      return { format: 'UNKNOWN', supported: false, description: '未知の形式' };
    }
  }

  // 形式チェック実行
  const formatInfo = detectImageFormat(binaryData);
  console.log(`検出形式: ${formatInfo.format} - ${formatInfo.description}`);

  if (!formatInfo.supported) {
    return {
      error: {
        code: 'UNSUPPORTED_FORMAT',
        message: `${formatInfo.format}形式はサポートされていません`,
        detectedFormat: formatInfo.format,
        solution: 'JPEGまたはPNG形式で保存し直してください'
      },
      conversionInstructions: {
        iPhone: '設定 → カメラ → フォーマット → "互換性優先" を選択',
        Android: 'カメラアプリでJPEG形式を選択',
        PC: '画像エディタでJPEG/PNG形式で保存し直し'
      },
      status: '❌ 非対応形式検出'
    };
  }

  // ファイルサイズチェック(20MB制限)
  const maxSize = 20 * 1024 * 1024;
  if (binaryData.length > maxSize) {
    throw new Error(`ファイルサイズが大きすぎます: ${Math.round(binaryData.length / 1024 / 1024)}MB (上限: 20MB)`);
  }

  // Base64エンコード
  let base64String = binaryData.toString('base64');
  base64String = base64String.replace(/[\r\n\s]/g, '');

  const metadata = $binary.data || {};

    // 成功レスポンス
  return {
    googleDriveMetadata: {
        fileId: fileId,
        fileName: fileName,
        mimeType: mimeType,
        parentFolders: parentFolders,
    },
    imageInfo: {
      fileName: metadata.fileName || 'receipt.jpg',
      format: formatInfo.format,
      sizeBytes: binaryData.length,
      sizeMB: Math.round(binaryData.length / 1024 / 1024 * 100) / 100
    },
    base64Image: base64String,
    processingTime: new Date().toISOString(),
    status: '✅ 画像処理完了 - Vision API送信準備完了'
  };
  
} catch (error) {
  console.error('画像処理エラー: ', error.message);

  const driveInfo = $input.first().json;

  return {
    error: {
      message: error.message,
      type: 'image_processing_error'
    },
    googleDriveMetadata: {
        fileId: driveInfo.id,
        fileName: driveInfo.name,
        mimeType: driveInfo.mimeType,
        parentFolders: driveInfo.parents || [],
    },
    troubleshooting: [
      '1. JPEG または PNG 形式の画像を使用',
      '2. ファイルサイズを20MB以下に',
      '3. 画像が破損していないかチェック'
    ],
    status: '❌ 画像処理失敗'      
  }
}