<?php
require_once('../database/header.php');
if($userdata['status']=='paywait'){
echo '<script>
window.location = "paywait.php"
</script>
';	
}
?>
<!-- Begin Page Content -->
   <div class="container-fluid">  
   <?php if($userdata['usertype']=="mainadmin") {?>
   <!-- DataTales Example -->
          <div class="card shadow mb-4">
            <div class="card-header py-3">
              <h6 class="m-0 font-weight-bold text-primary">NSDL e-KYC PAN History</h6>
            </div>
            <div class="card-body">

            <div class="">
                
<form class="row mb-3" method="post" action="">
	 <div class="col-md-2 mb-2">
		<input type="date" placeholder="From Date" name="fromdate"  value="<?=date("Y-m-d")?>" class="form-control" required/>			 
	</div>
	 <div class="col-md-2 mb-2">
	    <input type="date" placeholder="To Date" name="todate" value="<?=date("Y-m-d")?>" class="form-control" required/>			
	</div>
	 <div class="col-md-2 mb-2">
	    <select name="status" class="form-control" required/>
	      <option value="">Select</option>
	      <option value="Success">Success</option>
	      <option value="Pending">Pending</option>
	      <option value="Failed">Failed</option>
	    </select>
	</div>
	 <div class="col-md-3 mb-2">
	    <input type="text" placeholder="Order ID / Username / Etc" name="search_input" class="form-control"/>			
	</div>
	 <div class="col-md-3 mb-2">
	    <input type="submit" name="search" class='btn btn-primary' value="Search" >			
	</div>
</form>
    <div class="table-responsive">
                <table class="table table-bordered" id="dataTable" width="100%" cellspacing="0">
                  <thead>
                    <tr>
                      <th style='display:none;'>SL No.</th>
                      <th class='text-primary'>ORDER ID</th>
                      <th class='text-primary'>USER DETAILS</th>
                      <th class='text-primary'>APPLICATION</th>
                      <th class='text-primary'>ACK DETAILS</th>
                      <th class='text-primary'>BALANCE</th>
                      <th class='text-primary'>RESPONSE</th>
                      <th class='text-primary'>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
<?php
$fromdate = date("Y-m-d");
$todate = date("Y-m-d");
$search_input = '';
$status = '';
if(isset($_POST['search'])){
$fromdate = date("Y-m-d", strtotime($_POST['fromdate'])); 
$todate = date("Y-m-d", strtotime($_POST['todate'])); 	
$search_input = get_safe($_POST['search_input']); 
$status = get_safe($_POST['status']); 
}

$search_qury = "";
if(!empty($search_input)){
$search_qury = "CONCAT(order_id,username) LIKE '%$search_input%' AND";     
}

$statusSql = "";
if(!empty($status)){
$statusSql = "and status='".$status."' ";    
}

//$stmt = $conn->prepare("select * from ekycpancard WHERE $search_qury user_id='".$userdata['id']."' AND date_time>='".$fromdate." 00:00:00' AND date_time<='".$todate." 23:59:59' ORDER BY `id` DESC");
if($userdata['usertype']=='mainadmin'){
$stmt = $conn->prepare("select * from ekycpancard WHERE $search_qury date_time>='".$fromdate." 00:00:00' AND date_time<='".$todate." 23:59:59' $statusSql ORDER BY `id` DESC");
}

$stmt->execute();

$sl=1;
while($row=$stmt->fetch()) {

$type = "Electronic PAN"; 
if($row['type']=="P"){
$type = "Physical PAN";    
}

$gender = "Female"; 
if($row['gender']=="M"){
$gender = "Male";    
}



$json_array = base64_encode(json_encode(array('id'=>$row['id'],
'application_type'=>"PAN - Indian Citizen (Form 49A)",
'category'=>"INDIVIDUAL",
'name'=>$row['name'],
'dob'=>$row['dob'],
'mobile'=>$row['mobile'],
'email'=>$row['email'],
'amount'=>$row['amount'],
'agent_id'=>$row['username'],
'order_id'=>$row['order_id'],
'ack_no'=>$row['ack_no'],
'date_time'=>$row['date_time'],
)));



$invoice = '';
if($row['status']=='Success'){
$invoice = "<button class='btn btn-round btn-danger' onclick=\"getAck('$json_array')\" >View</button>";  
}

  echo "<tr>
                      <td style='display:none;'>".$sl."</td>
                      <td class='text-primary'>".$row['order_id']."<br><b>".strtoupper($type)."</b><br>".strtoupper($row['date_time'])."</td>
                      <td style='font-size:13px' class='text-primary'>".strtoupper($row['username'])."<br>".strtoupper($row['mobile'])."<br>".strtoupper($row['email'])."</td>
					  <td style='font-size:13px' class='text-primary'>".strtoupper($row['name'])."<br>".strtoupper($row['dob'])."<br>".strtoupper($gender)."</td>
                      <td><b style='font-size:13px' class='text-primary'>Ref ID: ".strtoupper($row['ref_id'])."<br>Ack No.".strtoupper($row['ack_no'])."</b></td>
                      <td class='text-primary'>Old Bal: Rs.".strtoupper($row['old_balance'])."<br>New Bal: Rs.".$row['new_balance']."</td> 
					  <td class='text-primary' style='font-size:13px'>".ucwords($row['remark'])."</td> 
                      <td class='text-primary'><b>".strtoupper($row['status'])."</b><br>".$invoice."</td>
                      </tr>";
					

		    
$sl++;}							
?>					
                  </tbody>
                </table>
                <button onclick="location.href='exportExcel?ekycExport=true&fromdate=<?=$fromdate?>&todate=<?=$todate?>&status=<?=$status?>'" class="btn btn-primary">Export Excel</button>
              </div>
              </div>
            </div>
          </div>
          
<div id="ack-modal" class="modal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="exampleModalLabel">PAN Acknowledgement</h5>
      </div>
      <div class="modal-body row">
     <div class="ackcontent mb-4"> 
        <div class="card bg-primary text-white" style="padding: 10px;border-radius: 10px;">
            <h5 class="text-white mb-2" style="font-size: 16px; font-weight: 600;">Online PAN Acknowledgement</h5>
            <hr>
            <div class="contact-form">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" class="bg-primary">
                    <tbody>
                        <tr>
                            <td width="33%" height="30">Application Type</td>
                            <td width="1%" height="30" align="center">:</td>
                            <td width="66%" height="30" id="application_type"></td>
                        </tr>
                        <tr>
                            <td height="30">Category</td>
                            <td align="center" height="30">:</td>
                            <td height="30" id="category"></td>
                        </tr>
                        <tr>
                            <td height="30">Name</td>
                            <td align="center" height="30">:</td>
                            <td height="30" id="name"></td>
                        </tr>
                        <tr>
                            <td height="30">Date of Birth</td>
                            <td align="center" height="30">:</td>
                            <td height="30" id="dob"></td>
                        </tr>
                        <tr>
                            <td height="30">Mobile</td>
                            <td align="center" height="30">:</td>
                            <td height="30" id="mobile"></td>
                        </tr>
                        <tr>
                            <td height="30">Email</td>
                            <td align="center" height="30">:</td>
                            <td height="30" id="email"></td>
                        </tr>
                        <tr>
                            <td height="30">Amount</td>
                            <td align="center" height="30">:</td>
                            <td height="30" id="amount"></td>
                        </tr>
                        <tr>
                            <td height="30">Agent ID</td>
                            <td align="center" height="30">:</td>
                            <td height="30" id="agent_id"></td>
                        </tr>
        
                        <tr>
                            <td height="30">Order ID</td>
                            <td align="center" height="30">:</td>
                            <td height="30" id="order_id"></td>
                        </tr>
        
                        <tr>
                            <td height="30">Ack No</td>
                            <td align="center" height="30">:</td>
                            <td height="30" id="ack_no"></td>
                        </tr>
        
                        <tr>
                            <td height="30">Date Time</td>
                            <td align="center" height="30">:</td>
                            <td height="30" id="date_time"></td>
                        </tr>
        
                    </tbody>
                </table>
            </div>
         </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-danger" data-tw-dismiss="modal">Close</button>
        <button type="button" class="btn btn-primary download" onclick="CreatePDFfromHTML('.ackcontent',$('#ack_no').text())">Save PDF</button>
      </div>
    </div>
  </div>
</div>        
<!-- END: Large Modal Content -->



<script>
function getAck(encode){
var json = atob(encode);
var obj = JSON.parse(json);  
document.getElementById("application_type").innerHTML = obj.application_type; 
document.getElementById("category").innerHTML = obj.category;
document.getElementById("name").innerHTML = obj.name; 
document.getElementById("dob").innerHTML = obj.dob; 
document.getElementById("mobile").innerHTML = obj.mobile; 
document.getElementById("email").innerHTML = obj.email; 
document.getElementById("amount").innerHTML = obj.amount; 
document.getElementById("agent_id").innerHTML = obj.agent_id; 
document.getElementById("order_id").innerHTML = obj.order_id; 
document.getElementById("ack_no").innerHTML = obj.ack_no; 
document.getElementById("date_time").innerHTML = obj.date_time; 
const myModal = tailwind.Modal.getInstance(document.querySelector("#ack-modal"));
myModal.show();
}   
</script>            
<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/1.5.3/jspdf.min.js"></script>
<script type="text/javascript" src="https://html2canvas.hertzen.com/dist/html2canvas.js"></script>
<script>
function CreatePDFfromHTML(elm,filename) {
    $(".download").attr("disabled",true)
    var HTML_Width = 380;
    var HTML_Height = 250;
    var top_left_margin = 15;
    var PDF_Width = HTML_Width + (top_left_margin * 2);
    var PDF_Height = (PDF_Width * 1.5) + (top_left_margin * 2);
    var canvas_image_width = HTML_Width;
    var canvas_image_height = HTML_Height;

    var totalPDFPages = Math.ceil(HTML_Height / PDF_Height) - 1;

    html2canvas($(elm)[0]).then(function (canvas) {
        var imgData = canvas.toDataURL("image/jpeg", 1.0);
        var pdf = new jsPDF('p', 'pt', [PDF_Width, PDF_Height]);
        pdf.addImage(imgData, 'JPG', top_left_margin, top_left_margin, canvas_image_width, canvas_image_height);
        for (var i = 1; i <= totalPDFPages; i++) { 
            pdf.addPage(PDF_Width, PDF_Height);
            pdf.addImage(imgData, 'JPG', top_left_margin, -(PDF_Height*i)+(top_left_margin*4),canvas_image_width,canvas_image_height);
        }
        pdf.save(filename+".pdf");
        $(".download").attr("disabled",false)
    });
}    
</script>          
<?php
}else{
?>
<img class="img-fluid" src="../bootstrap/img/cloud.png">
<?php
}
?>	  
        </div>
        <!-- /.container-fluid -->
      <!-- End of Main Content -->
<?php
require_once('../database/footer.php');
?>
<link href="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.2/css/select2.min.css" rel="stylesheet" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.2/js/select2.min.js"></script>
<script>
$(document).ready(function() {
$('.select2').select2({
    display: 'block',
    width: '100%',
    allowClear: false,
    height: 'calc(1.5em + .75rem + 2px)',
});
});
</script>