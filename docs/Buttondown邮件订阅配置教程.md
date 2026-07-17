# Buttondown邮件订阅配置教程（无需域名）

当前方案适用于不超过100人的小范围测试。Buttondown负责订阅表单、二次确认、退订、订阅名单和邮件投递；GitHub Actions每天把正式简报通过API交给Buttondown发送。

该方案不要求您购买域名，也不依赖EdgeOne网站长期在线。即使暂时没有正式网站地址，Buttondown自己的订阅页、邮件和历史归档仍可独立工作。

## 一、注册Buttondown

1. 打开 <https://buttondown.com/register>。
2. 使用您可以正常收信的管理员邮箱注册。
3. Newsletter name填写“每日麻醉文献精读”。
4. Username建议填写 `mazuiwenxian`；如果已被占用，可用 `anesthesia-literature-daily` 或页面允许的其他名称。
5. 打开注册确认邮件完成验证。

Username会形成公开订阅地址，例如：`https://buttondown.com/mazuiwenxian`，以及发件地址 `mazuiwenxian@buttondown.email`。

## 二、关闭不需要的收费功能

保持免费简报，不启用：

- Paid subscriptions；
- Analytics附加包；
- Automations附加包；
- RSS-to-email附加包；
- Custom archive domain；
- Whitelabeling。

本项目直接使用免费API发送，不需要购买RSS-to-email功能。当前官方规则为前100名有效订阅者免费，并假设每天最多向全部订阅者发送一封。

## 三、创建最小权限API Key

1. 在Buttondown后台进入 **API → Keys**。
2. 新建专用于本项目的Key。
3. 权限只开放：读取Newsletter、读取Subscriber数量、创建和发送Email。
4. 复制Key后立即保存到GitHub Secrets，不要发到聊天、Issue或截图中。

## 四、填写GitHub Secrets

进入GitHub仓库 → **Settings → Secrets and variables → Actions → Secrets → New repository secret**。

新增：

| 名称 | 值 |
| --- | --- |
| `BUTTONDOWN_API_KEY` | 刚创建的Buttondown API Key |

## 五、填写GitHub Variables

切换到 **Variables**，新增或修改：

| 名称 | 值 |
| --- | --- |
| `EMAIL_PROVIDER` | `buttondown` |
| `EMAIL_DELIVERY_ENABLED` | 第一次测试前填 `false`，测试连接成功后改 `true` |
| `NEXT_PUBLIC_BUTTONDOWN_USERNAME` | 您注册时选择的Username |
| `BUTTONDOWN_SUBSCRIBER_LIMIT` | `100` |

原腾讯云SES变量可以保留为空，不会被Buttondown模式读取。

## 六、填写EdgeOne公开变量

进入EdgeOne Makers项目 → 设置 → 环境变量，只新增：

| 名称 | 值 |
| --- | --- |
| `NEXT_PUBLIC_BUTTONDOWN_USERNAME` | Buttondown Username |

这是公开用户名，不是密码。绝对不要把 `BUTTONDOWN_API_KEY` 填进EdgeOne或任何 `NEXT_PUBLIC_` 变量。

保存后重新部署，首页和导航会出现“邮件订阅”，订阅表单直接提交到Buttondown并发送二次确认邮件。

## 七、测试API连接

在本地配置好环境变量后运行：

```text
npm run email:test-connection
```

成功时只显示连接状态、响应时间和Newsletter数量，不显示API Key。

## 八、第一次真实发送

1. 先用管理员自己的另一个邮箱打开 `https://buttondown.com/您的Username` 完成订阅和确认。
2. 在Buttondown Subscribers页面确认状态为 active/regular。
3. 把GitHub Variable `EMAIL_DELIVERY_ENABLED` 改为 `true`。
4. 打开GitHub Actions，手动运行新工作流 **“每日文献邮件”**；原“每日文献自动更新”现在只保留给管理员手动构建网站。
5. 任务会先生成并验证真实简报，再创建Buttondown草稿，最后把草稿切换为待发送。
6. 同一天重复运行时，程序会先查询相同标题邮件；已排队或已发送则直接跳过。

## 九、暂停与费用保护

- 暂停发送：把 `EMAIL_DELIVERY_ENABLED` 改为 `false`。
- 程序在发送前读取有效订阅者数量；超过 `BUTTONDOWN_SUBSCRIBER_LIMIT=100` 时停止发送。
- 不要开启收费附加功能。
- 免费政策可能变化，管理员应每月查看一次Buttondown Billing页面。
- Buttondown是境外服务，其订阅页面和中国邮箱送达率需要真实用户测试，不能预先保证。

## 十、迁移和退出

订阅者可以在每封邮件底部退订。管理员可从Buttondown导出订阅名单。以后购买域名后，可以切换回项目中保留的腾讯云SES适配，不需要重新开发文献生成流程。
