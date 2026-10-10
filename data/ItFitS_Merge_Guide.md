# ItFitS 合并与分用途训练包

本包配合前面的 `ItFitS_Data_Package.zip.001/.002/.003` 使用。已包含原版 `Merge_ItFitS.bat`，该脚本仅负责还原三段 ZIP；数据表合并由 `integrate_itfits.py` 完成。

## 已完成的合并

| 数据 | 保留数量 | 文件/目录 | 用途 |
|---|---:|---|---|
| 清洗版 Rent the Runway | 161,903 | `processed/fit_prediction/` | 用户真实反馈的 small/fit/large 预测 |
| Flowfit 中的 ModCloth | 81,252 | 同上，与 RTR 合并 | 同一三分类任务，保留来源及独立尺码体系 |
| Amazon Fashion | 24,070 | `processed/weak_reviews/amazon_fashion.csv` | 文本推断的弱标签、商品合身倾向分析 |
| FIT 配对图片 | 496 | `processed/fit/` | 人物图＋衣服图→穿着目标图；需要原包图像文件 |
| ANSUR 成年身体测量 | 6,066 | `processed/auxiliary/ansur_adults_cm.csv` | 男女性身体分布分析、尺寸合理性检查 |
| Body Measurements | 716 | `processed/auxiliary/body_measurements_flagged_cm.csv` | 字段语义与异常待复核，暂不参与默认训练 |

合并监督表共 **243,155** 条。标签为 small 34,507、fit 174,969、large 33,679。这里的 large 不等于 Oversize，未创建第四类或合成标签。

| 拆分 | RTR | ModCloth | 总计 |
|---|---:|---:|---:|
| train | 129,079 | 65,142 | 194,221 |
| validation | 16,339 | 8,097 | 24,436 |
| test | 16,485 | 8,013 | 24,498 |

## 清洗、去重与来源

- 清洗版 RTR 为权威来源。Flowfit 中全部 192,297 条 RTR 行保存在原始附件参考中，不重复加入监督表。按用户、商品、原类别、原尺码、标签及四舍五入至两位的身高体重比对，有 148,255 条 Flowfit 行匹配清洗版；这只是选定字段的匹配，不是已验证的 review ID 对应关系。未匹配变体也不自动补入。
- ModCloth 有 1,161 条缺少有效身高，放入 `quarantine/modcloth_rejected.csv`。接受范围为 120–220 cm，标签须是三分类且有用户、商品及尺码标识。
- 合并表选定字段的哈希重复数为 0。`sample_id` 为记录指纹，`source_row_id` 指向原附件中的行，原文件及两个附件 ZIP 都保留在 `reference/`。
- RTR 原有用户拆分保持不变；ModCloth 采用带固定种子的用户 ID 哈希拆分。来源内用户在 train/validation/test 之间不重叠。跨来源同一人的身份无法验证。
- 商品可以跨集合重叠：24,498 条测试记录中，24,382 条对应的商品也在训练集出现。因此评估是来源内新用户评估，不能声称是新商品评估。
- 身高统一为 cm、体重为 kg。年龄不在 18–95 时设为缺失；未知年龄保留，不据此宣称所有评价者均为成年人。
- ModCloth 所有接受行均缺少体重、年龄，不能补成真实测量。缺失值仅在模型预处理阶段用训练集统计量填充。
- Flowfit 的 `bust_cm_estimated=False` 不足以证明胸围为实测值。相关胸腰臀字段只在原始参考中保留；RTR `bust_size_raw` 是胸罩尺码字符串，不等于胸围厘米。
- RTR/ModCloth 数字尺码是各自平台代码，不转换为通用 S/M/L，也不当作衣服三围。`size_token` 加上来源前缀，防止相同数字被误认为相同尺寸。

## 已生成的模型预处理结果

默认输入为数值 `height_cm, weight_kg, age, bmi` 及类别 `source, category, size_token`。BMI 由已有身高体重重新计算，缺少任一项时保持缺失。`new/sale/wedding` 等商店分类的服装类别沿用输入表的 other，不凭空推断具体衣服款式。

`processed/fit_prediction/encoded/` 已生成：

- 各集合的 `*_X.npz` 稀疏矩阵、`*_y.npy` 标签及 `*_sample_ids.csv` 对应关系。
- `preprocessor.joblib`：数值中位数填充＋缺失指示＋标准化，类别 one-hot；只在 train 上拟合。
- `schema.json`：特征名称、标签编码、依赖版本及训练集填充值。small=0、fit=1、large=2。

未训练或比较模型准确率。加载本包自己生成的 joblib 时使用 `requirements.txt` 中相同的 scikit-learn 版本。验证集中有 1 条记录的来源尺码 token 未见于 train，编码为该类别块全零；测试集没有这种记录。

默认预测输入排除了用户/商品 ID、标签、来源行号和所有可能泄漏结果的汇总字段：`item_small_rate, item_large_rate, item_n_reviews, item_tendency_text, length_feedback, user_n_orders, has_size_history, user_usual_pct, size_offset_pct, size_pct`。弱评价的整理表同样排除了这些汇总字段。原始版本保留在 reference 中。以后加入商品反馈统计时，必须在拆分后构建；训练集的目标编码应采用折外方式，不能从验证或测试标签计算。

建议报告 majority baseline、macro-F1、各类别 F1、混淆矩阵，并分别报告 RTR 和 ModCloth 结果。合并的统计兼容性不代表两个来源没有分布差异。

## 男女性覆盖与用途边界

- 强监督尺码表的来源元数据均为女性；这不是逐个用户核验的生理性别。
- Amazon 的来源性别标记为男性 3,471、女性 11,050、未知 9,549。这些行没有身高、体重或三围，标签由评论文本推断，不能直接用于个性化身体尺码预测；原 `label_weight=0.5` 只是一项输入配置，不是测得的标签置信度。
- ANSUR 成年记录为男性 4,081、女性 1,985，男女都保留。它没有人物照片、衣服尺寸、购买反馈，不能和其他人的评论或图片随机拼接成训练样本，也不代表一般电商人口分布。
- FIT 当前两分片的性别未提供，不能给出男女比例。只有 231 条 train、16 条 validation、249 条官方 eval；其中 19 条 eval 的身体尺寸代理组未出现在原 train。代理组不等于已验证的人物身份。官方 eval 与 train 存在尺寸代理组交叉，默认同时提供 `eval_unseen_body.jsonl`。
- 要训练“同一人、同一款、不同尺码→不同松紧图”，仍需实际身体尺寸、每个尺码的衣服尺寸，以及对应真实穿着图。当前数据不能单独证明尺码控制或真实合身效果；普通评价 CSV 不参与图像生成训练。

## 使用 Merge_ItFitS 与图片

1. 将之前的三个分卷与本包中的 `Merge_ItFitS.bat` 放在同一文件夹。在 Windows 双击 BAT，还原 `ItFitS_Data_Package.zip`。
2. 本包解压到一个训练目录，例如 `ItFitS_Training`。将还原后的原数据 ZIP 也解压到这个目录。原包已有根目录，不会额外生成一层文件夹；目录下应同时有 `raw/fit/` 和 `processed/fit_prediction/`。
3. 如解压询问覆盖：本包的 `README_zh.md`、`requirements.txt` 及合并报告以本包版本为准。最简单的顺序是先解压原数据 ZIP，再解压本包到同一目录。
4. 安装依赖后，已有 `image_dataset.py` 可读取图像：

```python
from image_dataset import PairedTryOnDataset
dataset = PairedTryOnDataset('ItFitS_Training', split='train')
sample = dataset[0]  # person / cloth / target / measurements / prompt
```

图片转换为 RGB，按比例缩放后白色补边至 384×512，CHW float32，范围 [-1,1]。数字条件只用 FIT train 的统计量标准化。此 loader 提供样本，不是完整的扩散模型训练器。

在 macOS/Linux，可以依次按二进制连接三个分卷：

```bash
cat ItFitS_Data_Package.zip.001 ItFitS_Data_Package.zip.002 ItFitS_Data_Package.zip.003 > ItFitS_Data_Package.zip
```

本包没有重复打包约 1GB 的原图像分片。缺少前面的三个分卷时，表格训练可以使用，图像 loader 将找不到 `raw/fit/*.parquet`。

## 重现本次合并

在两个原附件和原图像包仍放在当前目录结构的情况下：

```bash
python integrate_itfits.py --rtr reference/ItFitS_RTR_Cleaned_Dataset.zip --flowfit reference/flowfit_integrated.csv.zip --base . --out rebuilt_itfits
```

脚本保留原附件、生成拆分和训练集拟合的预处理器，并输出 `reports/integration_report.json`。原 `prepare_data.py` 与 `download_data.py` 仍保留，只负责前一阶段图像/身体数据流程。

## 原始权限与数据质量

来源和前次检查保留在 `reference/FIT_source_README.md`、RTR 附件的 README 及 `base_reports/`。合并不扩大原始数据使用权限。FIT 的公开标注为 CC BY-NC-ND 4.0，不能据此声称已获商业训练许可；训练与再分发用途须核实权利人的允许范围。RTR/ModCloth/Amazon 附件本身也未提供统一商业使用许可。

Body Measurements 的胸部字段为 ChestWidth，不能直接当作胸围；242 条年龄成年记录仍含异常，保留的 adults_review_only 文件只是复核队列。它们未被随机补入图片、尺码监督表或默认编码矩阵。
